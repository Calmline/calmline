import { handleBoundaryWebhook } from "@/lib/boundary-shield/webhookEndpoint";
import { databaseFromEnv } from "@/lib/boundary-shield/boundaryDatabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleBoundaryWebhook(request, {
      secret: process.env.BOUNDARY_WEBHOOK_SECRET ?? "",
      now: new Date(),
      database: databaseFromEnv(),
    });
  } catch {
    return Response.json({ accepted: false, released: false, zendeskWrite: "disabled", executed: false }, { status: 503 });
  }
}
