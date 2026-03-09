import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export type PolicyListItem = {
  id: string;
  name: string;
  created_at: string;
  chunk_count: number;
  status: string;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("policies")
      .select("id, name, created_at, chunk_count, status")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list: PolicyListItem[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      chunk_count: p.chunk_count,
      status: p.status,
    }));

    return NextResponse.json({ policies: list });
  } catch (err) {
    console.error("[policies] list error:", err);
    const message = err instanceof Error ? err.message : "Failed to list policies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
