import { NextResponse } from "next/server";
import { retrievePolicyChunks } from "@/lib/policies";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    if (!q.trim()) {
      return NextResponse.json({ chunks: [] });
    }

    const chunks = await retrievePolicyChunks(q);

    return NextResponse.json({
      chunks: chunks.map((c) => ({
        content: c.content,
        metadata: c.metadata,
      })),
    });
  } catch (err) {
    console.error("[policies/retrieve] error:", err);
    const message = err instanceof Error ? err.message : "Retrieve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
