import { assertSubdomain } from "./zendeskOAuth";
import type { RoutingState } from "./emailRouting";

export type ZendeskTransport = (request: {
  method: "PUT";
  url: string;
  token: string;
  body: string;
}) => Promise<{ status: number }>;

export type RoutingWrite = {
  subdomain: string;
  accessToken: string;
  ticketId: string;
  disposition: RoutingState;
  reviewGroupId: string;
  normalGroupId: string;
};

export type WriteResult = {
  executed: boolean;
  reason: "writes-disabled" | "missing-group" | "invalid-tenant" | "applied" | "retryable" | "rejected" | "already-applied";
  status: number | null;
};

/**
 * Builds a ticket update that never adds a comment and never changes status.
 * Real HTTP is used only when writes are explicitly enabled for that call.
 */
export class ZendeskRoutingAdapter {
  readonly writesEnabled: boolean;
  private readonly transport: ZendeskTransport;

  constructor(transport: ZendeskTransport, writesEnabled = false) {
    this.transport = transport;
    this.writesEnabled = writesEnabled;
  }

  async apply(write: RoutingWrite): Promise<WriteResult> {
    if (!this.writesEnabled) return { executed: false, reason: "writes-disabled", status: null };
    if (!/^\d+$/.test(write.reviewGroupId) || !/^\d+$/.test(write.normalGroupId) || !/^\d+$/.test(write.ticketId)) {
      return { executed: false, reason: "missing-group", status: null };
    }
    let subdomain = "";
    try {
      subdomain = assertSubdomain(write.subdomain);
    } catch {
      return { executed: false, reason: "invalid-tenant", status: null };
    }
    const groupId = write.disposition === "clear" ? write.normalGroupId : write.reviewGroupId;
    const tagsToAdd = write.disposition === "clear"
      ? ["calmline_screen_clear"]
      : write.disposition === "protected"
        ? ["calmline_protected_queue"]
        : ["calmline_screen_pending"];
    const body = JSON.stringify({
      ticket: {
        group_id: Number(groupId),
        assignee_id: null,
        additional_tags: tagsToAdd,
        remove_tags: write.disposition === "pending" ? [] : ["calmline_screen_pending"],
      },
    });
    if (body.includes("comment") || body.includes("\"status\"")) {
      return { executed: false, reason: "rejected", status: null };
    }
    let status = 0;
    try {
      const response = await this.transport({
        method: "PUT",
        url: `https://${subdomain}.zendesk.com/api/v2/tickets/${write.ticketId}.json`,
        token: write.accessToken,
        body,
      });
      status = response.status;
    } catch {
      return { executed: false, reason: "retryable", status: null };
    }
    if (status === 200 || status === 201) return { executed: true, reason: "applied", status };
    if (status === 429 || status >= 500) return { executed: false, reason: "retryable", status };
    return { executed: false, reason: "rejected", status };
  }
}
