import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RoutingAuditEvent, RoutingDecision } from "./emailRouting";

export type TicketApplication = {
  accountId: string;
  ticketId: string;
  disposition: "pending" | "clear" | "protected";
  attempts: number;
  lastError: string | null;
  appliedAt: string | null;
};

export interface RoutingStore {
  getDecision(accountId: string, ticketId: string, commentId: string): RoutingDecision | null;
  putDecision(decision: RoutingDecision): void;
  deleteDecision(accountId: string, ticketId: string, commentId: string): void;
  listTicket(accountId: string, ticketId: string): RoutingDecision[];
  appendAudit(event: RoutingAuditEvent): void;
  listAudit(accountId: string): RoutingAuditEvent[];
  getDelivery(accountId: string, deliveryId: string): string | null;
  putDelivery(accountId: string, deliveryId: string, commentId: string): void;
  getApplication(accountId: string, ticketId: string): TicketApplication | null;
  putApplication(record: TicketApplication): void;
}

type TenantFile = {
  decisions: RoutingDecision[];
  audit: RoutingAuditEvent[];
  deliveries: Record<string, string>;
  applications: TicketApplication[];
};

export class MemoryRoutingStore implements RoutingStore {
  private readonly decisions: RoutingDecision[];
  private readonly audit: RoutingAuditEvent[];

  constructor(seed: RoutingDecision[] = []) {
    this.decisions = seed.map((decision) => ({ ...decision, executed: false }));
    this.audit = [];
  }

  getDecision(accountId: string, ticketId: string, commentId: string): RoutingDecision | null {
    return this.decisions.find((item) => item.accountId === accountId && item.ticketId === ticketId && item.commentId === commentId) ?? null;
  }

  putDecision(decision: RoutingDecision): void {
    const next = { ...decision, executed: false as const };
    const index = this.decisions.findIndex((item) => item.accountId === next.accountId && item.ticketId === next.ticketId && item.commentId === next.commentId);
    if (index >= 0) this.decisions[index] = next;
    else this.decisions.push(next);
  }

  deleteDecision(accountId: string, ticketId: string, commentId: string): void {
    const index = this.decisions.findIndex((item) => item.accountId === accountId && item.ticketId === ticketId && item.commentId === commentId);
    if (index >= 0) this.decisions.splice(index, 1);
  }

  listTicket(accountId: string, ticketId: string): RoutingDecision[] {
    return this.decisions.filter((item) => item.accountId === accountId && item.ticketId === ticketId).map((item) => ({ ...item }));
  }

  appendAudit(event: RoutingAuditEvent): void {
    this.audit.push({ ...event, executed: false });
  }

  listAudit(): RoutingAuditEvent[] {
    return this.audit.map((event) => ({ ...event }));
  }

  getDelivery(): string | null {
    return null;
  }

  putDelivery(): void {}

  getApplication(): null {
    return null;
  }

  putApplication(): void {}
}

function emptyFile(): TenantFile {
  return { decisions: [], audit: [], deliveries: {}, applications: [] };
}

export function tenantKey(accountId: string): string {
  const safe = accountId.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "");
  if (!safe || safe === "." || safe === ".." || safe.includes("..")) {
    throw new Error("Invalid tenant id");
  }
  return safe;
}

const FORBIDDEN_KEYS = ["text", "body", "plain_body", "html_body", "email", "accessToken", "refreshToken", "secret"];

function withoutSecrets<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (FORBIDDEN_KEYS.includes(key)) return undefined;
    return item;
  })) as T;
}

/**
 * One directory per Zendesk subdomain. A tenant cannot read another tenant's file.
 */
export class FileRoutingStore implements RoutingStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
    mkdirSync(root, { recursive: true });
  }

  getDecision(accountId: string, ticketId: string, commentId: string): RoutingDecision | null {
    return this.read(accountId).decisions.find((item) => item.ticketId === ticketId && item.commentId === commentId) ?? null;
  }

  putDecision(decision: RoutingDecision): void {
    const file = this.read(decision.accountId);
    const next = withoutSecrets(decision);
    next.executed = false;
    file.decisions = file.decisions.filter((item) => !(item.ticketId === next.ticketId && item.commentId === next.commentId));
    file.decisions.push(next);
    this.write(decision.accountId, file);
  }

  deleteDecision(accountId: string, ticketId: string, commentId: string): void {
    const file = this.read(accountId);
    file.decisions = file.decisions.filter((item) => !(item.ticketId === ticketId && item.commentId === commentId));
    this.write(accountId, file);
  }

  listTicket(accountId: string, ticketId: string): RoutingDecision[] {
    return this.read(accountId).decisions.filter((item) => item.ticketId === ticketId);
  }

  appendAudit(event: RoutingAuditEvent): void {
    const file = this.read(event.accountId);
    file.audit.push(withoutSecrets(event));
    this.write(event.accountId, file);
  }

  listAudit(accountId: string): RoutingAuditEvent[] {
    return this.read(accountId).audit.map((event) => ({ ...event }));
  }

  getDelivery(accountId: string, deliveryId: string): string | null {
    return this.read(accountId).deliveries[deliveryId] ?? null;
  }

  putDelivery(accountId: string, deliveryId: string, commentId: string): void {
    const file = this.read(accountId);
    file.deliveries[deliveryId] = commentId;
    this.write(accountId, file);
  }

  getApplication(accountId: string, ticketId: string): TicketApplication | null {
    return this.read(accountId).applications.find((item) => item.ticketId === ticketId) ?? null;
  }

  putApplication(record: TicketApplication): void {
    const file = this.read(record.accountId);
    const next = withoutSecrets(record);
    file.applications = file.applications.filter((item) => item.ticketId !== next.ticketId);
    file.applications.push(next);
    this.write(record.accountId, file);
  }

  private directory(accountId: string): string {
    const dir = path.resolve(this.root, tenantKey(accountId));
    const root = path.resolve(this.root);
    if (dir !== root && !dir.startsWith(`${root}${path.sep}`)) throw new Error("Invalid tenant path");
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private read(accountId: string): TenantFile {
    const file = path.join(this.directory(accountId), "routing.json");
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<TenantFile>;
      if (!parsed || typeof parsed !== "object") throw new Error("Unreadable routing store");
      return {
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
        deliveries: parsed.deliveries && typeof parsed.deliveries === "object" ? parsed.deliveries : {},
        applications: Array.isArray(parsed.applications) ? parsed.applications : [],
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return emptyFile();
      throw error;
    }
  }

  private write(accountId: string, file: TenantFile): void {
    const dir = this.directory(accountId);
    const target = path.join(dir, "routing.json");
    const temporary = path.join(dir, `.routing-${process.pid}.tmp`);
    writeFileSync(temporary, JSON.stringify(file));
    renameSync(temporary, target);
  }
}
