import { databaseFromEnv } from "@/lib/boundary-shield/boundaryDatabase";
import { tokenKeyFromEncoded } from "@/lib/boundary-shield/zendeskOAuth";
import { readZendeskComment } from "@/lib/boundary-shield/zendeskRead";
import { handleBoundaryWebhook } from "@/lib/boundary-shield/webhookEndpoint";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleBoundaryWebhook(request, {
      secret: process.env.BOUNDARY_WEBHOOK_SECRET ?? "",
      now: new Date(),
      database: databaseFromEnv(),
      tokenKey: tokenKeyFromEncoded(process.env.BOUNDARY_TOKEN_KEY),
      readComment: (input) => readZendeskComment({
        ...input,
        transport: async (lookup) => {
          const response = await fetch(lookup.url, {
            method: "GET",
            headers: { authorization: `Bearer ${lookup.token}`, accept: "application/json" },
          });
          return { status: response.status, body: await response.json().catch(() => null) };
        },
      }),
    });
  } catch {
    return Response.json({ accepted: false, released: false, zendeskWrite: "disabled", executed: false }, { status: 503 });
  }
}
