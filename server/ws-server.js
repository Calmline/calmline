/**
 * Standalone WebSocket server for Twilio Voice + Calmline live session.
 * Run: node server/ws-server.js
 * Env: PORT=3001 (default), GOOGLE_APPLICATION_CREDENTIALS for real STT (optional).
 *
 * Endpoints:
 * - /ws/audio — Twilio Media Stream connects here, sends base64 audio.
 * - /ws/session — Browser connects here, receives transcript events.
 */

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = parseInt(process.env.PORT || "3001", 10);

// Browser clients listening for transcripts (Live Session page).
const sessionClients = new Set();

// Twilio sends ~50 chunks/sec; we buffer and run STT every N chunks (~1s).
const CHUNKS_PER_STT = 50;
const audioBuffers = new Map(); // streamSid -> { chunks: [], count: 0 }

function getOrCreateBuffer(streamSid) {
  if (!audioBuffers.has(streamSid)) {
    audioBuffers.set(streamSid, { chunks: [], count: 0 });
  }
  return audioBuffers.get(streamSid);
}

function broadcastTranscript(text, isFinal = false) {
  const msg = JSON.stringify({ type: "transcript", text, isFinal });
  console.log("[Calmline WS] transcript:", text);
  sessionClients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

const { processBuffer } = require("./stt");

/**
 * Buffer base64 audio from Twilio; run STT when enough chunks. MVP: mock STT (no raw audio stored).
 */
function processAudioBuffer(streamSid, payloadBase64) {
  const buf = getOrCreateBuffer(streamSid);
  buf.chunks.push(payloadBase64);
  buf.count += 1;
  if (buf.count >= CHUNKS_PER_STT) {
    const chunks = buf.chunks.splice(0, buf.chunks.length);
    buf.count = 0;
    const transcript = processBuffer(chunks);
    if (transcript) broadcastTranscript(transcript, true);
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Calmline WebSocket server. Connect to /ws/audio (Twilio) or /ws/session (browser).");
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const path = new URL(request.url || "", `http://${request.headers.host}`).pathname;

  if (path === "/ws/audio") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
      handleAudioConnection(ws);
    });
  } else if (path === "/ws/session") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
      handleSessionConnection(ws);
    });
  } else {
    socket.destroy();
  }
});

function handleAudioConnection(ws) {
  let streamSid = null;

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.event === "media" && msg.media && msg.media.payload) {
        streamSid = msg.streamSid || streamSid || "default";
        processAudioBuffer(streamSid, msg.media.payload);
      }
      if (msg.event === "start" && msg.start) {
        streamSid = msg.start.streamSid || streamSid;
      }
      if (msg.event === "stop") {
        if (streamSid) audioBuffers.delete(streamSid);
        streamSid = null;
      }
    } catch (e) {
      console.error("[Calmline WS] audio message parse error:", e.message);
    }
  });

  ws.on("close", () => {
    if (streamSid) audioBuffers.delete(streamSid);
    console.log("[Calmline WS] Twilio audio stream disconnected");
  });

  ws.on("error", () => {});
}

function handleSessionConnection(ws) {
  sessionClients.add(ws);
  ws.send(JSON.stringify({ type: "connected", message: "Calmline session stream" }));

  ws.on("close", () => {
    sessionClients.delete(ws);
  });

  ws.on("error", () => {
    sessionClients.delete(ws);
  });
}

server.listen(PORT, () => {
  console.log(`[Calmline WS] Server listening on port ${PORT}`);
  console.log(`  - Twilio: wss://<host>:${PORT}/ws/audio`);
  console.log(`  - Browser: wss://<host>:${PORT}/ws/session`);
});
