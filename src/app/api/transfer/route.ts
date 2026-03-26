import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 TRANSFER API HIT");
    const body = await req.json();
    console.log("📦 Incoming body:", body);

    const res = await fetch("http://127.0.0.1:8787/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[transfer proxy error]", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
