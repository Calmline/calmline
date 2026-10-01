/** Exact Boundary Shield scripts from the realtime gateway — display/matching only. */
export const BOUNDARY_SHIELD_SCRIPTS = [
  "I want to help resolve this for you, but I need the conversation to remain respectful. If the language continues, I will need to end the call.",
  "I am here to help, but I cannot continue the call if the language remains inappropriate. If it continues, I will disconnect the line now.",
  "Since the language has continued after my warning, I am ending the call now. You may call back when you are ready to speak respectfully.",
  "I am unable to continue this conversation due to the language being used. This call is now ending.",
] as const;

export function isBoundaryShieldScript(text: string): boolean {
  const t = text.trim();
  return BOUNDARY_SHIELD_SCRIPTS.some((s) => s === t);
}

export function isBoundaryShieldActivationEvent(data: Record<string, unknown>): boolean {
  if (data.type === "risk_update" && Array.isArray(data.signals)) {
    return data.signals.some((s) => s === "abusive_language");
  }
  if (data.type === "conversation_state" && typeof data.state === "string") {
    return data.state.toUpperCase() === "ABUSIVE";
  }
  return false;
}
