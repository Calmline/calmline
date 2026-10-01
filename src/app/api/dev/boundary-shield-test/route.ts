import { NextResponse } from "next/server";

/** TEMPORARY — proxy for Boundary Shield test mode. Delete with the test panel. */

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const res = await fetch("http://127.0.0.1:8787/dev/boundary-shield-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Realtime gateway is not running on port 8787" },
      { status: 503 },
    );
  }
}
