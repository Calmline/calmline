import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseFromEnv } from "@/lib/boundary-shield/boundaryDatabase";
import { completeOAuthExchange } from "@/lib/boundary-shield/zendeskOAuthFlow";
import { tokenKeyFromEncoded } from "@/lib/boundary-shield/zendeskOAuth";
import { OAUTH_STATE_COOKIE, STAGING_OAUTH_REDIRECT_URI } from "@/lib/boundary-shield/zendeskOAuthState";

export const dynamic = "force-dynamic";

function finish(status: number, connected: boolean): NextResponse {
  const response = NextResponse.json({ connected }, { status });
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/zendesk/boundary-shield/oauth",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const clientId = process.env.ZENDESK_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.ZENDESK_OAUTH_CLIENT_SECRET ?? "";
  const tokenKey = tokenKeyFromEncoded(process.env.BOUNDARY_TOKEN_KEY);
  const database = databaseFromEnv();
  if (!clientId || !clientSecret || !tokenKey || !database) return finish(503, false);
  try {
    const result = await completeOAuthExchange({
      code: url.searchParams.get("code") ?? "",
      queryState: url.searchParams.get("state") ?? "",
      cookieValue: cookies().get(OAUTH_STATE_COOKIE)?.value ?? "",
      clientId,
      clientSecret,
      redirectUri: STAGING_OAUTH_REDIRECT_URI,
      tokenKey,
      database,
      transport: async (tokenRequest) => {
        const response = await fetch(tokenRequest.url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body: tokenRequest.body,
        });
        return { status: response.status, body: await response.json().catch(() => null) };
      },
    });
    return finish(result === "stored" ? 200 : 400, result === "stored");
  } catch {
    return finish(400, false);
  }
}
