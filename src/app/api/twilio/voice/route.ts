import { NextResponse } from "next/server";

/**
 * Twilio Voice webhook: returns TwiML to start a Media Stream to our WebSocket.
 * Configure this URL in Twilio Console: Phone Numbers → your number → Voice & Fax → A CALL COMES IN → Webhook → https://your-domain/api/twilio/voice
 */
export async function POST(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.TWILIO_WS_BASE_URL;
  const wsAudioUrl = baseUrl
    ? `${baseUrl.replace(/^http/, "ws")}/ws/audio`
    : "wss://your-domain/ws/audio";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${wsAudioUrl}" />
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
