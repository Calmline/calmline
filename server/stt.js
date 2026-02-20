/**
 * Speech-to-Text for Twilio Media Stream (8kHz μ-law).
 * MVP: mock that returns phrases. For production, use:
 * - Google Cloud Speech-to-Text streamingRecognize (mulaw 8kHz), or
 * - Buffer 2–3s chunks and call OpenAI Whisper (chunked).
 */

function decodeBase64Mulaw(base64) {
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf);
}

/**
 * Process buffered base64 payloads (Twilio sends μ-law 8kHz).
 * Returns a transcript string or null if not enough/silence.
 * Mock: returns a phrase every time. Replace with real STT.
 */
function processBuffer(base64Chunks) {
  if (!base64Chunks || base64Chunks.length === 0) return null;
  // MVP: no raw audio storage; only transcript. Mock output.
  return `Customer: [Live speech at ${new Date().toISOString().slice(11, 19)}].`;
}

/**
 * Optional: Google Cloud Speech-to-Text streaming.
 * Set GOOGLE_APPLICATION_CREDENTIALS and use streamingRecognize with
 * config: { encoding: 'MULAW', sampleRateHertz: 8000 }.
 */
function createGoogleStreamer() {
  return null; // Not implemented in MVP; add @google-cloud/speech and streamingRecognize.
}

module.exports = { processBuffer, decodeBase64Mulaw, createGoogleStreamer };
