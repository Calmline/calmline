# ngrok Reset: Fix ERR_NGROK_334 (Endpoint Already Online)

One active tunnel only. Execution-focused.

---

## 1. Kill all ngrok processes

```bash
pkill -f ngrok
```

If you started ngrok via `npx`:

```bash
pkill -f "npx ngrok"
```

On macOS you can also:

```bash
killall ngrok
```

---

## 2. Verify no ngrok processes remain

```bash
pgrep -fl ngrok
```

- **Empty output** = none running. Proceed.
- **Any line** = process still running. Run step 1 again, or `kill -9 <PID>` for each PID shown.

---

## 3. Restart Next.js dev server cleanly

Free port 3000 (Next.js default):

```bash
lsof -i :3000
```

Kill each PID listed (replace `12345` with actual PID):

```bash
kill -9 12345
```

Start one dev server:

```bash
cd /path/to/calmline
npm run dev
```

Wait until you see `Ready` and `localhost:3000`. Leave this terminal open.

---

## 4. Start a single ngrok tunnel

In a **new** terminal (only one ngrok process):

```bash
ngrok http 3000
```

You should see **exactly one** forwarding line:

```
Forwarding    https://xxxxx.ngrok-free.app -> http://localhost:3000
```

- If you see **two** Forwarding lines (e.g. http and https), that’s one tunnel with two URLs; use the **https** one for Twilio.
- If you get ERR_NGROK_334 again, a previous ngrok is still running. Repeat steps 1–2, then step 4.

---

## 5. Check active endpoints (ngrok dashboard)

- **Local:** Open **http://127.0.0.1:4040** (ngrok inspector).
- **Cloud:** Sign in at **https://dashboard.ngrok.com** → **Cloud Edge** / **Tunnels** (or **Endpoints**).

In the inspector you’ll see the tunnel and recent requests. Only one tunnel should be listed.

---

## 6. Prevent ERR_NGROK_334

- **One terminal, one tunnel:** Run `ngrok http 3000` in a single terminal. Don’t start a second ngrok in another tab/window.
- **Quit before restarting:** Use `Ctrl+C` in the ngrok terminal to stop the tunnel, then start again. Or run the kill commands (steps 1–2) before starting ngrok.
- **No duplicate configs:** Don’t run ngrok from scripts, PM2, or multiple envs that all start a tunnel to the same port/region.

---

## 7. Twilio webhook URL

Use the **https** URL from the single tunnel:

```
https://xxxxx.ngrok-free.app/api/twilio/voice
```

- Replace `xxxxx.ngrok-free.app` with your actual ngrok host.
- Method: **POST**.
- No trailing slash.

---

## Quick sequence (copy-paste)

```bash
# 1. Kill ngrok
pkill -f ngrok
pgrep -fl ngrok          # must be empty

# 2. (Optional) free port 3000 if Next.js is stuck
lsof -i :3000
# kill -9 <PID> for each

# 3. Terminal 1: Next.js
cd /path/to/calmline && npm run dev

# 4. Terminal 2: single ngrok (after Next.js is ready)
ngrok http 3000
```

Result: **exactly one** line like `Forwarding https://xxxxx.ngrok-free.app -> http://localhost:3000`. Use `https://xxxxx.ngrok-free.app/api/twilio/voice` in Twilio.
