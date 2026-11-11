# Boundary Shield staging

This build can be hosted later. It is not deployed, and it is not ready for the Zendesk Marketplace. Zendesk ticket writes are disabled in code.

## What staging runs

- `POST /api/zendesk/boundary-shield/webhook` verifies the Zendesk signature, checks the timestamp, and requires an installed subdomain.
- Decisions, audits, and delivery ids are stored in the Supabase Postgres tables from `supabase/migrations/008_boundary_shield_routing.sql`.
- Customer message text is not a database column. OAuth tokens are stored only as sealed values and are not selected by the webhook.
- A failed classification or a database error does not release a ticket.
- The local file store remains available for development tests. Staging does not use it as the production store.

## Hosting that is still required

- A Supabase project with the service role key kept on the server.
- The Next.js app hosted where Zendesk can reach the webhook over HTTPS.
- `BOUNDARY_WEBHOOK_SECRET` and `BOUNDARY_TOKEN_KEY` set only in the host's environment. Do not prefix them with `NEXT_PUBLIC_`.
- Marketplace OAuth client id and secret, also server-only, when an install flow is approved.
- Apply migration `008_boundary_shield_routing.sql` before the first webhook. Do not run it until that hosting step is approved.

## Rollback

1. Leave Zendesk triggers and webhooks off. This build does not create them.
2. If a later deploy is receiving webhooks, remove the webhook from Zendesk or point it nowhere, then redeploy the previous application build.
3. Confirm `config/boundary-shield.staging.example.json` still says `zendeskWritesEnabled: false` and the running code keeps `WEBHOOK_WRITES_ENABLED` false. No ticket group needs to be restored, because this build never calls the Zendesk ticket API.
4. To remove staging data, drop only the Boundary Shield tables and functions:

```sql
drop function if exists public.boundary_shield_note_stuck(interval);
drop function if exists public.boundary_shield_commit(jsonb);
drop table if exists public.boundary_audit;
drop table if exists public.boundary_deliveries;
drop table if exists public.boundary_decisions;
drop table if exists public.boundary_installations;
```

5. Do not drop the existing call, transcript, or policy tables as part of this rollback.
