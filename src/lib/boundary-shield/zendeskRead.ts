import { assertSubdomain } from "./zendeskOAuth";

export type ZendeskReadTransport = (request: {
  method: "GET";
  url: string;
  token: string;
}) => Promise<{ status: number; body: unknown }>;

export type ZendeskCommentRecord = {
  text: string;
  publicComment: boolean;
  channel: string;
  authorRole: string;
  createdAt: string;
};

const MAX_COMMENT_PAGES = 20;

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function commentsListUrl(subdomain: string, ticketId: string): string {
  return `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/comments.json`;
}

/** Accepts only another page of this ticket's comments. Other hosts are ignored. */
function allowedCommentsPage(subdomain: string, ticketId: string, value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.hostname !== `${subdomain}.zendesk.com`) return null;
  const path = url.pathname.replace(/\/$/, "");
  const expected = `/api/v2/tickets/${ticketId}/comments`;
  if (path !== expected && path !== `${expected}.json`) return null;
  return url.toString();
}

function nextCommentsPage(body: object, subdomain: string, ticketId: string): string | null {
  const record = body as { next_page?: unknown; links?: { next?: unknown } };
  const candidates = [record.next_page, record.links?.next];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate) continue;
    const allowed = allowedCommentsPage(subdomain, ticketId, candidate);
    if (allowed) return allowed;
  }
  return null;
}

/**
 * Reads one ticket comment and its author. Zendesk has no single-comment GET,
 * so this lists comments and selects the matching id. This client has no write method.
 */
export async function readZendeskComment(input: {
  subdomain: string;
  accessToken: string;
  ticketId: string;
  commentId: string;
  transport: ZendeskReadTransport;
}): Promise<ZendeskCommentRecord> {
  const subdomain = assertSubdomain(input.subdomain);
  if (!/^\d+$/.test(input.ticketId) || !/^\d+$/.test(input.commentId) || !input.accessToken.trim()) {
    throw new Error("Zendesk comment lookup was refused");
  }
  let pageUrl: string | null = commentsListUrl(subdomain, input.ticketId);
  let comment: Record<string, unknown> | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < MAX_COMMENT_PAGES && pageUrl; page += 1) {
    if (seen.has(pageUrl)) throw new Error("Zendesk comment lookup failed");
    seen.add(pageUrl);
    const response = await input.transport({ method: "GET", url: pageUrl, token: input.accessToken });
    if (response.status !== 200 || !response.body || typeof response.body !== "object") {
      throw new Error("Zendesk comment lookup failed");
    }
    const comments = (response.body as { comments?: unknown }).comments;
    if (!Array.isArray(comments)) throw new Error("Zendesk comment lookup failed");
    const match = comments.find((item) => {
      return Boolean(item) && typeof item === "object" && clean((item as { id?: unknown }).id) === input.commentId;
    });
    if (match && typeof match === "object") {
      comment = match as Record<string, unknown>;
      break;
    }
    pageUrl = nextCommentsPage(response.body, subdomain, input.ticketId);
  }
  if (!comment) throw new Error("Zendesk comment lookup failed");
  const authorId = clean(comment.author_id);
  if (!/^\d+$/.test(authorId)) throw new Error("Zendesk comment lookup failed");
  const authorResponse = await input.transport({
    method: "GET",
    url: `https://${subdomain}.zendesk.com/api/v2/users/${authorId}.json`,
    token: input.accessToken,
  });
  if (authorResponse.status !== 200 || !authorResponse.body || typeof authorResponse.body !== "object") {
    throw new Error("Zendesk author lookup failed");
  }
  const user = (authorResponse.body as { user?: { role?: unknown } }).user;
  const via = comment.via;
  const channel = via && typeof via === "object" && "channel" in via ? clean((via as { channel?: unknown }).channel) : "";
  return {
    text: clean(comment.plain_body) || clean(comment.body),
    publicComment: comment.public === true,
    channel,
    authorRole: clean(user?.role),
    createdAt: clean(comment.created_at),
  };
}
