import { NextRequest } from "next/server";

/**
 * Twilio Voice webhook: returns TwiML to start a Media Stream to realtime-gateway.
 *
 * One public URL (e.g. one ngrok tunnel → Next.js port 3000):
 * - Voice webhook: https://<host>/api/twilio/voice
 * - Media stream: wss://<host>/twilio/media — proxied by `server.js` to ws://127.0.0.1:8787/twilio/media
 *
 * Configure in Twilio: Phone Numbers → your number → Voice → Webhook → https://your-domain/api/twilio/voice
 */
export async function POST(req: NextRequest) {
  console.log("🔥 VOICE ROUTE HIT");
  const formData = await req.formData();
  const from = (formData.get("From") as string) || "unknown";

  console.log("[voice] incoming call from:", from);

  try {
    console.log("[voice] attempting precall fetch...");

    const res = await fetch("http://127.0.0.1:8787/precall", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        timestamp: Date.now(),
      }),
    });

    console.log("[voice] precall response status:", res.status);
  } catch (err) {
    console.log("[voice] precall ERROR:", err);
  }

  const streamUrl = `wss://${req.headers.get("host")}/twilio/media`;

  return new Response(
    `<Response>
     <Say>CalmLine is connected. You can begin speaking.</Say>
     <Pause length="60"/>
     <Start>
       <Stream url="${streamUrl}" />
     </Start>
   </Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
