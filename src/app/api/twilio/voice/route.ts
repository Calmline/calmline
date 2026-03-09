import { NextResponse } from "next/server";

/**
 * Twilio Voice webhook: returns TwiML to start a Media Stream to realtime-gateway.
 * Stream must be wss://<PUBLIC_HOST>/twilio/media so Twilio can reach the gateway (no localhost).
 * Configure in Twilio: Phone Numbers → your number → Voice → Webhook → https://your-domain/api/twilio/voice
 */
export async function POST(request: Request) {
  const baseUrl = process.env.TWILIO_WS_BASE_URL || process.env.NEXT_PUBLIC_WS_URL;
  const streamUrl = baseUrl
    ? `${baseUrl.replace(/^http/, "ws").replace(/\/$/, "")}/twilio/media`
    : "wss://your-domain/twilio/media";
  console.log("[twilio/voice] Stream URL (exact):", streamUrl);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${streamUrl}" />
  </Start>
  <Say>Connecting to Calmline test session.</Say>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
      "Cache-Control": "no-cache",
    },
  });
}
