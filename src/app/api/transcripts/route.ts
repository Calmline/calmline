import { NextResponse } from "next/server";
import { getRecentTranscripts } from "@/lib/supabase";

export async function GET() {
  try {
    const transcripts = await getRecentTranscripts(20);
    return NextResponse.json(transcripts);
  } catch (err) {
    console.error("Transcripts API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transcripts" },
      { status: 500 }
    );
  }
}
