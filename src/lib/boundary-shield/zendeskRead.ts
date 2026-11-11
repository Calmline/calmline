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

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

/**
 * Reads one ticket comment and its author. This client has no write method.
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
  const commentUrl = `https://${subdomain}.zendesk.com/api/v2/tickets/${input.ticketId}/comments/${input.commentId}.json`;
  const commentResponse = await input.transport({ method: "GET", url: commentUrl, token: input.accessToken });
  if (commentResponse.status !== 200 || !commentResponse.body || typeof commentResponse.body !== "object") {
    throw new Error("Zendesk comment lookup failed");
  }
  const comment = (commentResponse.body as { comment?: Record<string, unknown> }).comment;
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
