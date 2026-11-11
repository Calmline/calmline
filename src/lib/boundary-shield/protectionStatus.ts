import type { AlertRung } from "./types";

export type ProtectionRead = "waiting" | "ok" | "failed";

export type ProtectionView = {
  state: "not-connected" | "monitoring" | "warning" | "critical";
  title: string;
  detail: string;
  /** Kept separate from the current title so a clear read cannot hide earlier warnings. */
  history: string;
};

export function historyLabel(warningCount: number): string {
  if (warningCount === 1) return "1 warning on record";
  return `${warningCount} warnings on record`;
}

/**
 * Current protection status and warning history are separate.
 * An open incident is Warning or Critical. A later clear read stays Monitoring
 * and still reports the recorded count.
 */
export function protectionPresentation(input: {
  read: ProtectionRead;
  warningCount: number;
  openRung: AlertRung | null;
  unscored: boolean;
}): ProtectionView {
  const history = historyLabel(input.warningCount);
  if (input.read !== "ok") {
    return {
      state: "not-connected",
      title: "Not connected",
      detail: input.read === "failed"
        ? "The ticket conversation could not be read. The safe error code is in Advanced diagnostics."
        : "The Zendesk conversation has not been read yet.",
      history,
    };
  }
  if (input.openRung === "severe_threat") {
    return {
      state: "critical",
      title: "Critical",
      detail: "A severe threat was detected. Read the suggested response. Nothing is sent or ended automatically.",
      history,
    };
  }
  if (input.openRung) {
    return {
      state: "warning",
      title: "Warning",
      detail: "Abusive customer language was detected. Read the suggested response, then choose how to continue.",
      history,
    };
  }
  if (input.warningCount > 0) {
    return {
      state: "monitoring",
      title: "Monitoring",
      detail: "The latest read has no new abuse. Earlier warnings stay on record.",
      history,
    };
  }
  if (input.unscored) {
    return {
      state: "not-connected",
      title: "Not scored",
      detail: "Messages were received, but none were confirmed end-user text. The counts below show why.",
      history,
    };
  }
  return {
    state: "monitoring",
    title: "Monitoring",
    detail: "No abusive customer language was found in the confirmed end-user messages.",
    history,
  };
}
