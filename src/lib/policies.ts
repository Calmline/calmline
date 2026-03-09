import { supabase } from "@/lib/supabase";

export type PolicyChunk = {
  content: string;
  metadata: Record<string, unknown>;
};

export async function retrievePolicyChunks(query: string): Promise<PolicyChunk[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const { data, error } = await supabase
      .from("policy_chunks")
      .select("content, metadata")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[policies] retrievePolicyChunks supabase error:", error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row: any) => ({
      content: String(row.content ?? ""),
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }));
  } catch (err) {
    console.error("[policies] retrievePolicyChunks error:", err);
    return [];
  }
}

