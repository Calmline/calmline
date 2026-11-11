import type { BoundaryShieldSessionStore } from "./engine";

/**
 * Local acknowledgement of an incident the agent has already handled.
 * The record identifies the account, ticket, and incident. It never contains
 * the customer message.
 */
export type IncidentAcknowledgement = {
  accountId: string;
  ticketId: string;
  fingerprint: string;
  acknowledgedAt: string;
};

export type AcknowledgementStorage = {
  read: () => string | null;
  write: (value: string) => void;
};

type SavedAcknowledgements = {
  records: IncidentAcknowledgement[];
};

const SAVED_RECORD_KEYS = ["accountId", "ticketId", "fingerprint", "acknowledgedAt"];

function clean(value: string): string {
  return value.trim();
}

function isSafeFingerprint(value: string): boolean {
  return /^zendesk-[0-9a-f]+-\d+$/.test(value);
}

function recordKey(record: Pick<IncidentAcknowledgement, "accountId" | "ticketId" | "fingerprint">): string {
  return `${clean(record.accountId).toLowerCase()}|${clean(record.ticketId)}|${clean(record.fingerprint)}`;
}

export class IncidentAcknowledgementLedger {
  private readonly storage: AcknowledgementStorage;

  constructor(storage: AcknowledgementStorage) {
    this.storage = storage;
  }

  remember(input: IncidentAcknowledgement): IncidentAcknowledgement | null {
    const accountId = clean(input.accountId).toLowerCase();
    const ticketId = clean(input.ticketId);
    const fingerprint = clean(input.fingerprint);
    const acknowledgedAt = clean(input.acknowledgedAt);
    if (!accountId || !ticketId || !isSafeFingerprint(fingerprint) || !acknowledgedAt) return null;
    const record: IncidentAcknowledgement = { accountId, ticketId, fingerprint, acknowledgedAt };
    const saved = this.read();
    const key = recordKey(record);
    const without = saved.records.filter((existing) => recordKey(existing) !== key);
    without.push(record);
    this.storage.write(JSON.stringify({ records: without }));
    return record;
  }

  has(accountId: string, ticketId: string, fingerprint: string): boolean {
    const key = recordKey({ accountId, ticketId, fingerprint });
    return this.read().records.some((record) => recordKey(record) === key);
  }

  private read(): SavedAcknowledgements {
    let raw: string | null = null;
    try {
      raw = this.storage.read();
    } catch {
      return { records: [] };
    }
    if (!raw) return { records: [] };
    try {
      const parsed = JSON.parse(raw) as { records?: unknown };
      if (!parsed || !Array.isArray(parsed.records)) return { records: [] };
      return {
        records: parsed.records.filter((item): item is IncidentAcknowledgement => {
          if (!item || typeof item !== "object") return false;
          const record = item as Partial<IncidentAcknowledgement>;
          return typeof record.accountId === "string"
            && typeof record.ticketId === "string"
            && typeof record.fingerprint === "string"
            && typeof record.acknowledgedAt === "string"
            && isSafeFingerprint(record.fingerprint)
            && Object.keys(record).every((key) => SAVED_RECORD_KEYS.includes(key));
        }),
      };
    } catch {
      return { records: [] };
    }
  }
}

/** Clears a previously handled open incident without removing it from history. */
export function suppressAcknowledgedIncidents(
  session: BoundaryShieldSessionStore,
  ledger: IncidentAcknowledgementLedger,
  accountId: string,
  ticketId: string,
): void {
  for (const state of session.listStates()) {
    const open = state.openAlert;
    if (!open) continue;
    if (ledger.has(accountId, ticketId, open.segmentId)) {
      session.acknowledge(state.conversationId, open.id);
    }
  }
}
