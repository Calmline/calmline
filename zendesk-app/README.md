# Calmline Boundary Shield sidebar

Zendesk Apps Framework 2.0 app for the Support ticket sidebar.

Live Zendesk Talk audio is not connected. See `TALK_ACCESS.md`.

## Demo without a Zendesk account

From the Calmline project root:

```bash
npm run build:zendesk-app
```

Then open `zendesk-app/assets/iframe.html` in a browser, or, if Calmline is already running, open:

http://localhost:3000/zendesk-app/iframe.html

The page opens on “Monitoring — no abuse detected.” Press **Play simulated call** to send sample lines. A warning appears only if a sample customer line qualifies. No API keys and no Zendesk login are used.

Inside a real Zendesk ticket the demo controls are hidden. The app does not read the ticket text, call audio, or live transcripts.

## What needs a Zendesk account

Installing the app into Support, seeing it on a real ticket, and any future live Voice or chat feed. Locally that is `zcli apps:validate` and `zcli apps:server` after you sign in to a Zendesk instance. This repository does not deploy the app.
