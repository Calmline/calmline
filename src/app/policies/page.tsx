"use client";

import { useState, useEffect, useCallback } from "react";

type PolicyItem = {
  id: string;
  name: string;
  created_at: string;
  chunk_count: number;
  status: string;
};

type Toast = { type: "success" | "error"; message: string } | null;

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
    <div className="mx-auto max-w-2xl">
      <section className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Policy Upload</h1>
        <p className="mt-0.5 text-sm text-slate-700">
          Paste policy text below. It will be chunked, embedded, and stored for use in live coaching.
        </p>
      </section>

      <form onSubmit={handleUpload} className="mt-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Document name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Escalation Policy Q1 2025"
            className="mt-1 block w-full h-10 rounded-lg border border-slate-300 px-4 text-sm text-slate-800 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <div>
          <label htmlFor="text" className="block text-sm font-medium text-slate-700">
            Policy text
          </label>
          <textarea
            id="text"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your policy document text here..."
            className="mt-1 block w-full min-h-[180px] rounded-lg border border-slate-300 px-4 py-4 text-sm leading-relaxed text-slate-800 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !text.trim()}
          className="btn-press btn-primary h-11 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Policies</h2>
        {listLoading ? (
          <p className="mt-3 text-sm text-neutral-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No policies uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p
                    role="button"
                    tabIndex={0}
                    onClick={() => handleView(p.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleView(p.id)}
                    className="text-sm font-medium text-slate-900 truncate cursor-pointer"
                  >
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleString()} · {p.chunk_count} chunks · {p.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleView(p.id)}
                  disabled={viewLoading}
                  className="ml-2 shrink-0 h-10 rounded-lg border border-slate-300 px-5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="ml-2 shrink-0 h-10 rounded-lg border border-slate-300 px-5 text-sm text-red-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewingPolicy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setViewingPolicy(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[80vh] rounded-xl border border-slate-200 bg-white shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{viewingPolicy.name}</h3>
              <button
                type="button"
                onClick={() => setViewingPolicy(null)}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
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
