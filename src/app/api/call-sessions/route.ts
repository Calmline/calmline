import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : null;

    let query = supabase
      .from("call_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (days != null && !isNaN(days) && days > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
      query = query.gte("created_at", thirtyDaysAgo.toISOString());
    }

    const { data, error } = await query.limit(days != null ? 1000 : 50);

    if (error) {
      console.error("[call-sessions] fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[call-sessions] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch call sessions" },
      { status: 500 }
    );
  }
}
