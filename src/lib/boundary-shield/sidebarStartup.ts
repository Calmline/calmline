/** Shown until a real abusive customer transcript event arrives. */
export const MONITORING_STATUS = "Monitoring — no abuse detected";

/** Keep this the same as zendesk-app/manifest.json. */
export const APP_VERSION = "0.1.9";

/** Installed Support apps are served from Zendesk, even when the ZAF client is not ready yet. */
export function isInstalledZendeskHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().split(":")[0];
  return host === "zendesk.com" || host.endsWith(".zendesk.com") || host.endsWith(".zdusercontent.com");
}

export type SidebarStartupPlan = {
  host: "zendesk" | "demo";
  /** Startup must never play sample abuse. */
  autoplay: false;
  showDemoControls: boolean;
  initialStatus: typeof MONITORING_STATUS;
  modeLabel: string;
  banner: string;
  /** Ticket subject, description, and comments are not transcript events. */
  readsTicketBody: false;
  readsLiveAudio: false;
};

/**
 * Real Zendesk tickets and the local demo both start quiet.
 * Demo controls are available only outside Zendesk, and only after the agent presses Play.
 */
export function planSidebarStartup(input: { zafAvailable: boolean; hostname?: string }): SidebarStartupPlan {
  const installed = input.zafAvailable || isInstalledZendeskHost(input.hostname ?? "");
  if (installed) {
    return {
      host: "zendesk",
      autoplay: false,
      showDemoControls: false,
      initialStatus: MONITORING_STATUS,
      modeLabel: `Boundary Shield ${APP_VERSION}`,
      banner:
        "Live call audio and live transcripts are not connected. No warning is shown until a qualifying abusive customer transcript event is received.",
      readsTicketBody: false,
      readsLiveAudio: false,
    };
  }
  return {
    host: "demo",
    autoplay: false,
    showDemoControls: true,
    initialStatus: MONITORING_STATUS,
    modeLabel: "Demo mode. No Zendesk account required.",
    banner:
      "Demo only. A warning appears only after you press Play simulated call and a sample line qualifies. Live call audio is not connected.",
    readsTicketBody: false,
    readsLiveAudio: false,
  };
}
