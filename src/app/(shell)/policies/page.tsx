"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  FileText,
  Shield,
  Lock,
  Database,
  UploadCloud,
  ReceiptText,
  ShieldAlert,
  GitBranch,
  MessageSquareText,
  Bell,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

type PolicyItem = {
  id: string;
  name: string;
  created_at: string;
  chunk_count: number;
  status: string;
};

type Toast = { type: "success" | "error"; message: string } | null;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-2.5 py-1 text-[11px] font-medium text-[rgba(18,13,6,0.55)]">
      {children}
    </span>
  );
}

function ControlItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-3.5">
      <span className="mt-0.5 text-[#9A5E1A]" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#120D06]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">{description}</p>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PolicyItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<{ id: string; name: string; content: string } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setList(data.policies ?? []);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to load policies");
    } finally {
      setListLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/policies/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setText("");
      setName("");
      showToast("success", `Uploaded ${data.chunks_inserted} chunks as "${data.name}"`);
      await fetchList();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleView(id: string) {
    setViewLoading(true);
    setViewingPolicy(null);
    try {
      const res = await fetch(`/api/policies/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setViewingPolicy({ id: data.id, name: data.name, content: data.content ?? "" });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to load policy");
    } finally {
      setViewLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      showToast("success", "Policy deleted");
      await fetchList();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Policy Engine</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          Your policies power every response Calmline generates.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>Encrypted</Pill>
          <Pill>Isolated</Pill>
          <Pill>Private</Pill>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#120D06]">Active policies</h2>
              <span className="rounded-full border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-2.5 py-1 text-xs font-medium text-[rgba(18,13,6,0.5)]">
                2 active
              </span>
            </div>

            {listLoading ? (
              <p className="text-sm text-[rgba(18,13,6,0.5)]">Loading policies…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-[rgba(18,13,6,0.5)]">No policies uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {list.map((p) => {
                  const active = p.status.toLowerCase() === "active";
                  return (
                    <li key={p.id}>
                      <div className="group flex items-center justify-between gap-4 rounded-lg border border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] p-4 transition hover:bg-[#EEE4DE]">
                        <button
                          type="button"
                          onClick={() => handleView(p.id)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          disabled={viewLoading}
                        >
                          <span className="mt-0.5 shrink-0 text-[rgba(18,13,6,0.45)]">
                            <FileText className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#120D06]">
                              {p.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-[rgba(18,13,6,0.45)]">
                              {new Date(p.created_at).toLocaleDateString()} · {p.chunk_count} pages
                            </span>
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              active
                                ? "bg-emerald-500/15 text-emerald-200/90 ring-1 ring-emerald-500/20"
                                : "bg-[#EEE4DE] text-[rgba(18,13,6,0.5)] ring-1 ring-[rgba(150,118,80,0.2)]"
                            }`}
                          >
                            {active ? "Active" : "Archived"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="rounded-lg border border-[rgba(150,118,80,0.2)] px-3 py-1.5 text-xs font-medium text-[rgba(18,13,6,0.6)] transition hover:bg-[#EEE4DE] disabled:opacity-50"
                          >
                            {deletingId === p.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
            <h2 className="text-base font-semibold text-[#120D06]">Upload policy</h2>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div className="rounded-xl border border-dashed border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEE4DE] text-emerald-200/85">
                  <UploadCloud className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-medium text-[#120D06]">Drop your policy document</p>
                <p className="mt-1 text-xs text-[rgba(18,13,6,0.45)]">PDF or DOCX · Up to 50MB</p>
              </div>

              <div className="grid gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Policy name"
                  className="h-10 w-full rounded-lg border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] px-3 text-sm text-[#120D06] placeholder:text-[rgba(18,13,6,0.35)] focus:border-emerald-400/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/20"
                  required
                />
                <textarea
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste policy text..."
                  className="w-full rounded-lg border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] px-3 py-2.5 text-sm leading-relaxed text-[#120D06] placeholder:text-[rgba(18,13,6,0.35)] focus:border-emerald-400/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/20"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || !text.trim()}
                className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Uploading…" : "Upload policy"}
              </button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
              Policies are securely stored and used only to guide AI responses within your
              organization.
            </p>
          </Card>
        </div>

        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-base font-semibold text-[#120D06]">What this controls</h2>
          <div className="mt-4 space-y-3">
            <ControlItem
              icon={<ReceiptText className="h-4 w-4" />}
              title="Refund rules"
              description="What agents are allowed to offer"
            />
            <ControlItem
              icon={<ShieldAlert className="h-4 w-4" />}
              title="Abuse handling"
              description="Approved warning and escalation scripts"
            />
            <ControlItem
              icon={<GitBranch className="h-4 w-4" />}
              title="Escalation paths"
              description="When calls should be transferred"
            />
            <ControlItem
              icon={<MessageSquareText className="h-4 w-4" />}
              title="Tone & language"
              description="Brand voice and response style"
            />
            <ControlItem
              icon={<Bell className="h-4 w-4" />}
              title="Manager alerts"
              description="When supervisors are notified"
            />
          </div>
        </Card>
      </div>

      {viewingPolicy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewingPolicy(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] shadow-[0_2px_10px_rgba(100,70,30,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(150,118,80,0.12)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#120D06]">{viewingPolicy.name}</h3>
              <button
                type="button"
                onClick={() => setViewingPolicy(null)}
                className="text-sm font-medium text-[rgba(18,13,6,0.45)] hover:text-[#120D06]"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-[rgba(18,13,6,0.45)]">
                {viewingPolicy.content || "No content."}
              </pre>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
