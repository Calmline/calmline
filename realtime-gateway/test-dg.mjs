import "dotenv/config";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const apiKey = process.env.DEEPGRAM_API_KEY;
if (!apiKey) throw new Error("Missing DEEPGRAM_API_KEY");

const deepgram = createClient(apiKey);
console.log("[test] creating DG live connection...");

const dg = deepgram.listen.live({
  model: "nova-2",
  encoding: "mulaw",
  sample_rate: 8000,
  channels: 1,
  interim_results: true,
  smart_format: true,
});

dg.on(LiveTranscriptionEvents.Open, () => console.log("[test] DG Open (SDK event)"));
dg.on("open", () => console.log("[test] DG open (raw event)"));
dg.on(LiveTranscriptionEvents.Close, (e) => console.log("[test] DG Close (SDK)", e));
dg.on("close", (code, reason) =>
  console.log(`[test] DG close (raw) code=${code} reason="${String(reason)}"`),
);
dg.on(LiveTranscriptionEvents.Error, (e) => console.log("[test] DG Error (SDK)", e));
dg.on("error", (e) => console.log("[test] DG error (raw)", e));

setTimeout(() => {
  console.log("[test] done waiting 5s, closing...");
  dg.requestClose?.();
  process.exit(0);
}, 5000);
