import { EmailRoutingWorkflow } from "./emailRouting";
import type { RoutingAuditEvent } from "./emailRouting";
import type { BoundaryDatabase } from "./boundaryDatabase";
import { MemoryRoutingStore } from "./routingStore";
import { openOauthCredential } from "./zendeskOAuth";
import { ZendeskReadFailure, readZendeskComment, zendeskReadFailureLog, type ZendeskReadTransport } from "./zendeskRead";
import { createRefreshingTransport } from "./zendeskTokenRefresh";
import { verifyZendeskWebhookSignature } from "./zendeskWebhookSignature";

/** Staging and production webhook handlers cannot enable Zendesk writes. */
export const WEBHOOK_WRITES_ENABLED = false;

export type ZendeskCommentReader = (input: {
  subdomain: string;
  accessToken: string;
  ticketId: string;
  commentId: string;
}) => Promise<{
  text: string;
  publicComment: boolean;
  channel: string;
  authorRole: string;
  createdAt: string;
}>;

export type ZendeskTokenRotator = (input: {
  subdomain: string;
  expectedSealedRefreshToken: string;
}) => Promise<string | null>;

export type WebhookDependencies = {
  secret: string;
  now: Date;
  database: BoundaryDatabase | null;
  tokenKey?: Buffer | null;
  readComment?: ZendeskCommentReader;
  zendeskGet?: ZendeskReadTransport;
  rotateToken?: ZendeskTokenRotator;
};

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function channelFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "channel" in value) return clean((value as { channel?: unknown }).channel);
  return "";
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify({ ...body, zendeskWrite: "disabled", executed: false }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * HTTP webhook handler. An invalid signature, unknown tenant, or database
 * failure does not release a ticket. The response never includes message text.
 */
export async function handleBoundaryWebhook(request: Request, deps: WebhookDependencies): Promise<Response> {
  if (!deps.secret.trim() || !deps.database) return json({ accepted: false, released: false }, 503);
  const body = await request.text();
  const verified = verifyZendeskWebhookSignature({
    secret: deps.secret,
    timestamp: request.headers.get("x-zendesk-webhook-signature-timestamp") ?? "",
    signature: request.headers.get("x-zendesk-webhook-signature") ?? "",
    body,
    now: deps.now,
  });
  if (!verified.ok) return json({ accepted: false, released: false }, 401);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return json({ accepted: false, released: false }, 400);
  }
  const record = payload as {
    account?: { subdomain?: unknown };
    accountId?: unknown;
    ticket?: { id?: unknown; via?: unknown };
    comment?: { id?: unknown; body?: unknown; plain_body?: unknown; public?: unknown; created_at?: unknown; author?: { role?: unknown } };
  };
  const accountId = (clean(record.accountId) || clean(record.account?.subdomain)).toLowerCase();
  let installation;
  try {
    installation = accountId ? await deps.database.getInstallation(accountId) : null;
  } catch {
    return json({ accepted: false, released: false }, 503);
  }
  if (!installation) return json({ accepted: false, released: false }, 401);
  const ticketId = clean(record.ticket?.id);
  const commentId = clean(record.comment?.id);
  const deliveryId = (request.headers.get("x-zendesk-webhook-invocation-id") ?? "").trim() || `comment:${accountId}:${ticketId}:${commentId}`;
  let text = clean(record.comment?.plain_body) || clean(record.comment?.body);
  let channel = channelFrom(record.ticket?.via);
  let visibility = record.comment?.public;
  let authorRole = clean(record.comment?.author?.role);
  let createdAt = clean(record.comment?.created_at);
  if (!text && ticketId && commentId) {
    const sealed = installation.sealedAccessToken;
    const reader = deps.readComment ?? (deps.zendeskGet ? (input: {
      subdomain: string;
      accessToken: string;
      ticketId: string;
      commentId: string;
    }) => readZendeskComment({
      ...input,
      transport: createRefreshingTransport({
        send: deps.zendeskGet as ZendeskReadTransport,
        rotate: () => deps.rotateToken?.({
          subdomain: accountId,
          expectedSealedRefreshToken: installation.sealedRefreshToken ?? "",
        }) ?? Promise.resolve(null),
      }),
    }) : null);
    if (!reader || !deps.tokenKey || !sealed) {
      return json({ accepted: false, released: false }, 503);
    }
    let accessToken = "";
    try {
      const credential = openOauthCredential(sealed, deps.tokenKey);
      if (credential.scope !== "read") return json({ accepted: false, released: false }, 503);
      accessToken = credential.secret;
      const remote = await reader({ subdomain: accountId, accessToken, ticketId, commentId });
      text = clean(remote.text);
      channel = clean(remote.channel) || channel;
      visibility = remote.publicComment;
      authorRole = clean(remote.authorRole);
      createdAt = clean(remote.createdAt) || createdAt;
    } catch (error) {
      if (error instanceof ZendeskReadFailure) console.error(zendeskReadFailureLog(error));
      return json({ accepted: false, released: false }, 503);
    } finally {
      accessToken = "";
    }
  }
  let prior;
  try {
    prior = ticketId ? await deps.database.listTicket(accountId, ticketId) : [];
  } catch {
    return json({ accepted: false, released: false }, 503);
  }
  const workflow = new EmailRoutingWorkflow({
    reviewGroupId: installation.reviewGroupId,
    normalGroupId: installation.normalGroupId,
    store: new MemoryRoutingStore(prior),
  });
  const decision = workflow.handle({
    accountId,
    ticketId,
    commentId,
    channel,
    authorRole,
    publicComment: typeof visibility === "boolean" ? visibility : null,
    text,
    createdAt: createdAt || deps.now.toISOString(),
  }, deps.now.toISOString());
  const audit: RoutingAuditEvent = {
    at: deps.now.toISOString(),
    accountId: decision.accountId,
    ticketId: decision.ticketId,
    commentId: decision.commentId,
    type: decision.state === "pending" ? "held" : "classified",
    state: decision.state,
    severity: decision.severity,
    effect: decision.effect,
    reason: decision.reason,
    executed: false,
  };
  try {
    const saved = await deps.database.commit({ deliveryId, decision, audit });
    return json({
      accepted: true,
      released: false,
      duplicate: saved.duplicate,
      state: saved.state,
      effect: saved.effect,
    }, 200);
  } catch {
    return json({ accepted: false, released: false }, 503);
  }
}
