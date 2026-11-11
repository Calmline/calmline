import { createClient } from "@supabase/supabase-js";
import type { RoutingAuditEvent, RoutingDecision, RoutingState } from "./emailRouting";

export type TenantInstallationRecord = {
  subdomain: string;
  reviewGroupId: string;
  normalGroupId: string;
  sealedAccessToken: string | null;
};

export type CommitResult = {
  duplicate: boolean;
  state: RoutingState;
  effect: RoutingDecision["effect"];
  executed: false;
};

export type StuckScreening = {
  accountId: string;
  ticketId: string;
  commentId: string;
  state: "pending";
  ageMs: number;
};

/**
 * Transactional boundary-shield database.
 * Implementations must reject message text and must not mark a decision executed.
 */
export interface BoundaryDatabase {
  getInstallation(subdomain: string): Promise<TenantInstallationRecord | null>;
  saveInstallation(record: TenantInstallationRecord): Promise<void>;
  listTicket(accountId: string, ticketId: string): Promise<RoutingDecision[]>;
  commit(input: {
    deliveryId: string;
    decision: RoutingDecision;
    audit: RoutingAuditEvent;
  }): Promise<CommitResult>;
  noteStuck(now: Date, maxAgeMs: number): Promise<StuckScreening[]>;
}

type Row = {
  decision: RoutingDecision;
  recoveryNotedAt: string | null;
};

/**
 * In-memory transaction queue used by tests and local staging without a database.
 * Concurrent commits for the same delivery cannot both insert.
 */
export class MemoryBoundaryDatabase implements BoundaryDatabase {
  private chain: Promise<void> = Promise.resolve();
  private readonly installations = new Map<string, TenantInstallationRecord>();
  private readonly decisions: Row[] = [];
  private readonly deliveries = new Map<string, string>();
  private readonly audit: RoutingAuditEvent[] = [];

  getInstallation(subdomain: string): Promise<TenantInstallationRecord | null> {
    return this.exclusive(() => this.installations.get(subdomain.trim().toLowerCase()) ?? null);
  }

  saveInstallation(record: TenantInstallationRecord): Promise<void> {
    return this.exclusive(() => {
      this.installations.set(record.subdomain.trim().toLowerCase(), { ...record });
    });
  }

  listTicket(accountId: string, ticketId: string): Promise<RoutingDecision[]> {
    return this.exclusive(() => this.decisions
      .filter((row) => row.decision.accountId === accountId && row.decision.ticketId === ticketId)
      .map((row) => ({ ...row.decision })));
  }

  commit(input: { deliveryId: string; decision: RoutingDecision; audit: RoutingAuditEvent }): Promise<CommitResult> {
    return this.exclusive(() => {
      assertNoMessage(input);
      const deliveryKey = `${input.decision.accountId}|${input.deliveryId}`;
      const decisionKey = `${input.decision.accountId}|${input.decision.ticketId}|${input.decision.commentId}`;
      if (this.deliveries.has(deliveryKey) || this.decisions.some((row) => keyOf(row.decision) === decisionKey)) {
        const existing = this.decisions.find((row) => keyOf(row.decision) === decisionKey)?.decision;
        return {
          duplicate: true,
          state: existing?.state ?? "pending",
          effect: existing?.effect ?? "hold-pending",
          executed: false,
        };
      }
      this.deliveries.set(deliveryKey, input.decision.commentId);
      this.decisions.push({ decision: { ...input.decision, executed: false }, recoveryNotedAt: null });
      this.audit.push({ ...input.audit, executed: false });
      return { duplicate: false, state: input.decision.state, effect: input.decision.effect, executed: false };
    });
  }

  noteStuck(now: Date, maxAgeMs: number): Promise<StuckScreening[]> {
    return this.exclusive(() => {
      const stuck: StuckScreening[] = [];
      for (const row of this.decisions) {
        if (row.decision.state !== "pending" || !row.decision.blocksRelease || row.recoveryNotedAt) continue;
        const ageMs = now.getTime() - Date.parse(row.decision.createdAt);
        if (ageMs < maxAgeMs) continue;
        row.recoveryNotedAt = now.toISOString();
        stuck.push({
          accountId: row.decision.accountId,
          ticketId: row.decision.ticketId,
          commentId: row.decision.commentId,
          state: "pending",
          ageMs,
        });
      }
      return stuck;
    });
  }

  private exclusive<T>(work: () => T): Promise<T> {
    const run = this.chain.then(work, work);
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }
}

type RpcClient = {
  rpc: (fn: string, args: { payload?: unknown; max_age?: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
  installation: (subdomain: string) => Promise<TenantInstallationRecord | null>;
  ticket: (accountId: string, ticketId: string) => Promise<RoutingDecision[]>;
};

/** Server-side adapter. Callers must pass a service-role client created outside the browser. */
export function createSupabaseBoundaryDatabase(client: RpcClient): BoundaryDatabase {
  return {
    getInstallation(subdomain) {
      return client.installation(subdomain);
    },
    async saveInstallation() {
      throw new Error("Installation writes are not part of the webhook request");
    },
    listTicket(accountId, ticketId) {
      return client.ticket(accountId, ticketId);
    },
    async commit(input) {
      assertNoMessage(input);
      const payload = {
        account_id: input.decision.accountId,
        ticket_id: input.decision.ticketId,
        comment_id: input.decision.commentId,
        delivery_id: input.deliveryId,
        created_at: input.decision.createdAt,
        recorded_at: input.audit.at,
        state: input.decision.state,
        effect: input.decision.effect,
        severity: input.decision.severity,
        reason: input.decision.reason,
        blocks_release: input.decision.blocksRelease,
        event_type: input.audit.type,
      };
      const { data, error } = await client.rpc("boundary_shield_commit", { payload });
      if (error) throw new Error("Boundary database commit failed");
      const row = data as { duplicate?: boolean; state?: RoutingState; effect?: RoutingDecision["effect"] };
      return {
        duplicate: Boolean(row?.duplicate),
        state: row?.state ?? "pending",
        effect: row?.effect ?? "hold-pending",
        executed: false,
      };
    },
    async noteStuck() {
      const { error } = await client.rpc("boundary_shield_note_stuck", { max_age: "15 minutes" });
      if (error) throw new Error("Boundary stuck-ticket note failed");
      return [];
    },
  };
}

export function databaseFromEnv(env: Record<string, string | undefined> = process.env): BoundaryDatabase | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false } });
  return createSupabaseBoundaryDatabase({
    rpc: async (fn, args) => {
      const { data, error } = await client.rpc(fn, args);
      return { data, error: error ? { message: error.message } : null };
    },
    async installation(subdomain) {
      const { data, error } = await client
        .from("boundary_installations")
        .select("subdomain, review_group_id, normal_group_id")
        .eq("subdomain", subdomain)
        .maybeSingle();
      if (error) throw new Error("installation lookup failed");
      if (!data) return null;
      return {
        subdomain: String(data.subdomain),
        reviewGroupId: String(data.review_group_id),
        normalGroupId: String(data.normal_group_id),
        sealedAccessToken: null,
      };
    },
    async ticket(accountId, ticketId) {
      const { data, error } = await client
        .from("boundary_decisions")
        .select("account_id, ticket_id, comment_id, created_at, state, effect, severity, reason, blocks_release")
        .eq("account_id", accountId)
        .eq("ticket_id", ticketId);
      if (error) throw new Error("decision lookup failed");
      return (data ?? []).map((row) => hydrateDecision(row as Record<string, unknown>));
    },
  });
}

function hydrateDecision(row: Record<string, unknown>): RoutingDecision {
  const ticketId = String(row.ticket_id ?? "");
  return {
    accountId: String(row.account_id ?? ""),
    ticketId,
    commentId: String(row.comment_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    state: row.state === "clear" || row.state === "protected" ? row.state : "pending",
    effect: row.effect === "release-to-normal-queue" || row.effect === "hold-for-review" ? row.effect : "hold-pending",
    severity: (typeof row.severity === "string" ? row.severity : "unclassified") as RoutingDecision["severity"],
    reason: String(row.reason ?? ""),
    blocksRelease: Boolean(row.blocks_release),
    executed: false,
    update: {
      executed: false,
      ticketId,
      groupId: null,
      assigneeId: null,
      tagsToAdd: [],
      tagsToRemove: [],
      reviewState: null,
      publicComment: null,
      status: null,
    },
  };
}

function keyOf(decision: RoutingDecision): string {
  return `${decision.accountId}|${decision.ticketId}|${decision.commentId}`;
}

function assertNoMessage(input: { decision: RoutingDecision; audit: RoutingAuditEvent }): void {
  const serialized = JSON.stringify(input);
  if (/"text"|"body"|"plain_body"|"accessToken"|"sealedAccessToken"/.test(serialized)) {
    throw new Error("message text is not stored");
  }
}
