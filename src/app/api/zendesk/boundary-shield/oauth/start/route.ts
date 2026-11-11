import { NextResponse } from "next/server";
import { zendeskAuthorizeUrl } from "@/lib/boundary-shield/zendeskOAuth";
import {
  createOAuthState,
  encodeOAuthStateCookie,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  STAGING_OAUTH_REDIRECT_URI,
} from "@/lib/boundary-shield/zendeskOAuthState";

export const dynamic = "force-dynamic";

function refused(status: number): NextResponse {
  return NextResponse.json({ connected: false }, { status });
}

export async function GET(request: Request): Promise<NextResponse> {
  const clientId = process.env.ZENDESK_OAUTH_CLIENT_ID?.trim() ?? "";
  if (!clientId) return refused(503);
  const subdomain = new URL(request.url).searchParams.get("subdomain") ?? "";
  try {
    const state = createOAuthState();
    const location = zendeskAuthorizeUrl({
      subdomain,
      clientId,
      redirectUri: STAGING_OAUTH_REDIRECT_URI,
      state,
      scope: "read",
    });
    const response = NextResponse.redirect(location);
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: encodeOAuthStateCookie({ state, subdomain }),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/zendesk/boundary-shield/oauth",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return refused(400);
  }
}
