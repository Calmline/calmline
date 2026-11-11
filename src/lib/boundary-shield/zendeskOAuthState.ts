import { randomBytes, timingSafeEqual } from "node:crypto";
import { assertSubdomain } from "./zendeskOAuth";

export const OAUTH_STATE_COOKIE = "calmline_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;
export const STAGING_OAUTH_REDIRECT_URI =
  "https://calmline-email-shield-staging.vercel.app/api/zendesk/boundary-shield/oauth/callback";

export type OAuthStateRecord = {
  state: string;
  subdomain: string;
};

export function createOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function encodeOAuthStateCookie(record: OAuthStateRecord): string {
  const subdomain = assertSubdomain(record.subdomain);
  if (!/^[0-9a-f]{64}$/.test(record.state)) throw new Error("Invalid OAuth state");
  return `${record.state}.${subdomain}`;
}

export function parseOAuthStateValue(value: string): OAuthStateRecord | null {
  const separator = value.lastIndexOf(".");
  if (separator < 0) return null;
  const state = value.slice(0, separator);
  if (!/^[0-9a-f]{64}$/.test(state)) return null;
  try {
    return { state, subdomain: assertSubdomain(value.slice(separator + 1)) };
  } catch {
    return null;
  }
}

export function readOAuthStateCookie(cookieHeader: string | null, name = OAUTH_STATE_COOKIE): OAuthStateRecord | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;
  return parseOAuthStateValue(decodeURIComponent(pair.slice(name.length + 1)));
}

export function oauthStateMatches(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
