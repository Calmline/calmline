import { databaseFromEnv } from "@/lib/boundary-shield/boundaryDatabase";
import { tokenKeyFromEncoded } from "@/lib/boundary-shield/zendeskOAuth";
import { refreshSealedZendeskToken } from "@/lib/boundary-shield/zendeskTokenRefresh";
import { handleBoundaryWebhook } from "@/lib/boundary-shield/webhookEndpoint";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const database = databaseFromEnv();
    const tokenKey = tokenKeyFromEncoded(process.env.BOUNDARY_TOKEN_KEY);
    return await handleBoundaryWebhook(request, {
      secret: process.env.BOUNDARY_WEBHOOK_SECRET ?? "",
      now: new Date(),
      database,
      tokenKey,
      zendeskGet: async (lookup) => {
        const response = await fetch(lookup.url, {
          method: "GET",
          headers: { authorization: `Bearer ${lookup.token}`, accept: "application/json" },
        });
        return { status: response.status, body: await response.json().catch(() => null) };
      },
      rotateToken: (input) => {
        if (!database || !tokenKey) return Promise.resolve(null);
        return refreshSealedZendeskToken({
          ...input,
          database,
          tokenKey,
          clientId: process.env.ZENDESK_OAUTH_CLIENT_ID?.trim() ?? "",
          clientSecret: process.env.ZENDESK_OAUTH_CLIENT_SECRET ?? "",
          transport: async (tokenRequest) => {
            const response = await fetch(tokenRequest.url, {
              method: "POST",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: tokenRequest.body,
            });
            return { status: response.status, body: await response.json().catch(() => null) };
          },
        });
      },
    });
  } catch {
    return Response.json({ accepted: false, released: false, zendeskWrite: "disabled", executed: false }, { status: 503 });
  }
}
