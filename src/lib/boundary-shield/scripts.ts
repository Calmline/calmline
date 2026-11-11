import { BOUNDARY_SHIELD_SCRIPTS } from "../boundaryShieldScripts";
import type { AbuseKind, AgentAction, AlertRung } from "@/lib/boundary-shield/types";

/** Same approved wording the live gateway already sends to agents. */
export const WARNING_LADDER_SCRIPTS: Record<AlertRung, string> = {
  first_warning: BOUNDARY_SHIELD_SCRIPTS[0],
  final_warning: BOUNDARY_SHIELD_SCRIPTS[1],
  severe_threat: BOUNDARY_SHIELD_SCRIPTS[3],
};

export const AGENT_ACTIONS: readonly AgentAction[] = [
  "acknowledge",
  "continue",
  "request_supervisor_review",
];

export function alertTitle(rung: AlertRung, kind: AbuseKind): string {
  if (rung === "severe_threat") return "Severe threat";
  if (rung === "final_warning") return "Final warning";
  if (kind === "discrimination") return "First warning · discriminatory abuse";
  if (kind === "harassment") return "First warning · harassment";
  return "First warning";
}
