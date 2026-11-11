import { EmailRoutingWorkflow } from "./emailRouting";
import type { RoutingDecision, RoutingState } from "./emailRouting";
import type { RoutingStore, TicketApplication } from "./routingStore";
import type { TenantInstallation } from "./zendeskOAuth";
import { ZendeskRoutingAdapter } from "./zendeskRoutingClient";
import type { RoutingWrite, WriteResult } from "./zendeskRoutingClient";
import { verifyZendeskWebhookSignature } from "./zendeskWebhookSignature";

export type MarketplaceReceipt = {
  status: 200 | 400 | 401;
  accepted: boolean;
  decision: RoutingDecision | null;
  disposition: RoutingState | null;
  write: WriteResult | null;
};

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function installationFor(installations: readonly TenantInstallation[], subdomain: string): TenantInstallation | null {
  const key = subdomain.trim().toLowerCase();
  return installations.find((item) => item.subdomain.trim().toLowerCase() === key) ?? null;
}

/**
 * Signed webhook entry for one marketplace install.
 * Group ids come from that tenant's installation. Writes stay off unless the adapter was built with them on.
 */
export async function receiveMarketplaceWebhook(input: {
  appSecret: string;
  timestamp: string;
  signature: string;
  body: string;
  deliveryId: string;
  now: Date;
  store: RoutingStore;
  installations: readonly TenantInstallation[];
  adapter: ZendeskRoutingAdapter;
  accessToken?: string;
}): Promise<MarketplaceReceipt> {
  const verified = verifyZendeskWebhookSignature({
    secret: input.appSecret,
    timestamp: input.timestamp,
    body: input.body,
    signature: input.signature,
    now: input.now,
  });
  if (!verified.ok) return { status: 401, accepted: false, decision: null, disposition: null, write: null };
  let payload: unknown;
  try {
    payload = JSON.parse(input.body);
  } catch {
    return { status: 400, accepted: false, decision: null, disposition: null, write: null };
  }
  const record = payload as {
    account?: { subdomain?: unknown };
    accountId?: unknown;
    ticket?: { id?: unknown; via?: { channel?: unknown } | string };
    comment?: { id?: unknown; body?: unknown; plain_body?: unknown; public?: unknown; created_at?: unknown; author?: { role?: unknown } };
  };
  const accountId = (clean(record.accountId) || clean(record.account?.subdomain)).toLowerCase();
  const installation = installationFor(input.installations, accountId);
  if (!accountId || !installation) {
    return { status: 401, accepted: false, decision: null, disposition: null, write: null };
  }
  const commentId = clean(record.comment?.id);
  const via = record.ticket?.via;
  const channel = typeof via === "string" ? via : clean(via && typeof via === "object" ? via.channel : "");
  const visibility = record.comment?.public;
  const workflow = new EmailRoutingWorkflow({
    reviewGroupId: installation.reviewGroupId,
    normalGroupId: installation.normalGroupId,
    store: input.store,
  });
  const seen = input.deliveryId ? input.store.getDelivery(accountId, input.deliveryId) : null;
  const decision = workflow.handle({
    accountId,
    ticketId: clean(record.ticket?.id),
    commentId: seen || commentId,
    channel: seen ? "email" : channel,
    authorRole: seen ? "end-user" : clean(record.comment?.author?.role),
    publicComment: seen ? true : typeof visibility === "boolean" ? visibility : null,
    text: seen ? "" : clean(record.comment?.plain_body) || clean(record.comment?.body),
    createdAt: clean(record.comment?.created_at) || input.timestamp,
  }, input.timestamp);
  if (input.deliveryId && commentId && !seen) input.store.putDelivery(accountId, input.deliveryId, commentId);
  const disposition = decision.ticketId ? workflow.ticketState(accountId, decision.ticketId) : "pending";
  const write = await applyDisposition({
    adapter: input.adapter,
    store: input.store,
    installation,
    accountId,
    ticketId: decision.ticketId,
    disposition,
    accessToken: input.accessToken ?? "",
    at: input.timestamp,
  });
  return { status: 200, accepted: true, decision, disposition, write };
}

async function applyDisposition(input: {
  adapter: ZendeskRoutingAdapter;
  store: RoutingStore;
  installation: TenantInstallation;
  accountId: string;
  ticketId: string;
  disposition: RoutingState;
  accessToken: string;
  at: string;
}): Promise<WriteResult> {
  if (!input.ticketId) return { executed: false, reason: "missing-group", status: null };
  const previous = input.store.getApplication(input.accountId, input.ticketId);
  if (previous?.appliedAt && previous.disposition === input.disposition) {
    return { executed: false, reason: "already-applied", status: null };
  }
  const request: RoutingWrite = {
    subdomain: input.installation.subdomain,
    accessToken: input.accessToken,
    ticketId: input.ticketId,
    disposition: input.disposition,
    reviewGroupId: input.installation.reviewGroupId,
    normalGroupId: input.installation.normalGroupId,
  };
  const result = await input.adapter.apply(request);
  const application: TicketApplication = {
    accountId: input.accountId,
    ticketId: input.ticketId,
    disposition: input.disposition,
    attempts: (previous?.attempts ?? 0) + (input.adapter.writesEnabled ? 1 : 0),
    lastError: result.executed ? null : result.reason,
    appliedAt: result.executed ? input.at : previous?.appliedAt ?? null,
  };
  if (input.adapter.writesEnabled) input.store.putApplication(application);
  return result;
}
