/**
 * Custom Next.js HTTP server with WebSocket upgrade proxy:
 * wss://<host>/twilio/media → ws://127.0.0.1:8787/twilio/media (realtime-gateway).
 *
 * Twilio and the browser use one public URL (e.g. one ngrok tunnel to port 3000).
 * Run: npm run dev | npm start
 */
const http = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const gatewayWsBase =
  process.env.REALTIME_GATEWAY_WS_URL || "ws://127.0.0.1:8787";

/**
 * Next registers its own `upgrade` listener on first HTTP request. We wrap
 * `server.on` so `/twilio/media` is proxied to the gateway before Next runs
 * (HMR, etc.).
 */
function patchUpgradeInterceptor(server) {
  const origOn = server.on.bind(server);
  server.on = function (event, listener) {
    if (event !== "upgrade") {
      return origOn(event, listener);
    }
    return origOn(
      event,
      async (req, socket, head) => {
        let pathname = "/";
        try {
          pathname = new URL(
            req.url || "/",
            `http://${req.headers.host}`,
          ).pathname;
        } catch {
          socket.destroy();
          return;
        }

        if (pathname.startsWith("/twilio/media")) {
          try {
            await proxyTwilioMediaToGateway(req, socket, head);
          } catch (err) {
            console.error("[twilio/media proxy] error", err);
            socket.destroy();
          }
          return;
        }

        await listener(req, socket, head);
      },
    );
  };
}

function proxyTwilioMediaToGateway(req, socket, head) {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ noServer: true });
    try {
      wss.handleUpgrade(req, socket, head, (twilioWs) => {
        try {
          const url = new URL(req.url || "/", `http://${req.headers.host}`);
          const pathAndQuery = url.pathname + (url.search || "");
          const upstreamUrl = `${gatewayWsBase.replace(/\/$/, "")}${pathAndQuery}`;

          const upstream = new WebSocket(upstreamUrl);
          const pending = [];
          let upstreamOpen = false;
          let cleaned = false;

          function cleanup() {
            if (cleaned) return;
            cleaned = true;
            try {
              twilioWs.close();
            } catch {
              /* ignore */
            }
            try {
              upstream.close();
            } catch {
              /* ignore */
            }
          }

          twilioWs.on("message", (data, isBinary) => {
            if (upstreamOpen && upstream.readyState === WebSocket.OPEN) {
              upstream.send(data, { binary: isBinary });
            } else {
              pending.push({ data, isBinary });
            }
          });

          upstream.on("open", () => {
            upstreamOpen = true;
            for (const p of pending) {
              upstream.send(p.data, { binary: p.isBinary });
            }
            pending.length = 0;
          });

          upstream.on("message", (data, isBinary) => {
            if (twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(data, { binary: isBinary });
            }
          });

          twilioWs.on("ping", (data) => {
            if (upstream.readyState === WebSocket.OPEN) upstream.ping(data);
          });
          twilioWs.on("pong", (data) => {
            if (upstream.readyState === WebSocket.OPEN) upstream.pong(data);
          });
          upstream.on("ping", (data) => {
            if (twilioWs.readyState === WebSocket.OPEN) twilioWs.ping(data);
          });
          upstream.on("pong", (data) => {
            if (twilioWs.readyState === WebSocket.OPEN) twilioWs.pong(data);
          });

          twilioWs.on("close", cleanup);
          upstream.on("close", cleanup);
          twilioWs.on("error", (e) => {
            console.error("[twilio/media proxy] client socket error", e);
            cleanup();
          });
          upstream.on("error", (e) => {
            console.error("[twilio/media proxy] gateway socket error", e);
            cleanup();
          });

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling", req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("internal server error");
      }
    }
  });

  patchUpgradeInterceptor(server);

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(
      "> Twilio Media Stream proxy: /twilio/media → ws://127.0.0.1:8787/twilio/media",
    );
  });
});
