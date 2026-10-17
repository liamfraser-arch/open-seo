# Client portal

Give a client a login to a live, read-only dashboard of their own project.

## How it works

- Clients sign in through Cloudflare Access (an emailed one-time code).
- A client email is attached to one or more projects under **Project → Settings → General → Client access**.
- Clients land on `/portal` and see only those projects. They get no sidebar and no settings, and they can't run anything that costs credits.
- You edit what they see under **Project → Settings → Client report**: the 6-month plan, keyword groups with ranks, and wins.
- Staff can preview exactly what a client sees at `/portal/<projectId>`, and add `?demo=1` to see sample data (staff only, never saved).

## Setup (Cloudflare self-hosting)

The one-command deploy (`pnpm deploy:selfhost`) creates an Access policy that allows only `ACCESS_ALLOWED_EMAILS` and only covers the `workers.dev` address, so for client logins on your own domain you manage Access yourself and let the app decide who gets in. The deploy refuses to run if that setup is incomplete.

1. **Log in to Cloudflare (once).** `pnpm alchemy login`, then `pnpm alchemy cloudflare bootstrap`. Your domain's zone must be on the same Cloudflare account.
2. **Create the Access application.** In Cloudflare Zero Trust (create the free team the first time), go to Access → Applications → Add an application → Self-hosted. Use the hostname you want, for example `app.serpsurfers.com`, and add an **Allow** policy that includes **Everyone**. Keep **One-time PIN** enabled as the login method. Copy the **Application Audience (AUD) tag** and your **team domain** (`https://<team>.cloudflareaccess.com`).
3. **Create `.env.selfhost`** (`cp deploy/.env.selfhost.example .env.selfhost`) and set:
   - `DATAFORSEO_API_KEY`
   - `TEAM_DOMAIN` and `POLICY_AUD` from step 2
   - `CUSTOM_DOMAIN=app.serpsurfers.com`
   - `ADMIN_EMAILS=you@serpsurfers.com` (comma-separated). **Required here.** Without it, everyone Access admits is an admin, so the deploy refuses to continue.
   - optionally `GOOGLE_MAPS_API_KEY` (restrict that key to `https://app.serpsurfers.com/*`) and `OPENSEO_TELEMETRY_DISABLED=1`
4. **Deploy.** `pnpm deploy:selfhost --yes`.
5. **Add clients** under Project → Settings → General → Client access. No redeploy is needed.
6. **Test once for real.** Sign in with a second email you control, added as a client, and check you land on the portal and nothing else. This is the one part that can't be tested locally.
7. Send the client `https://app.serpsurfers.com`. They enter their email, get a code, and land on their dashboard.

With an "Everyone" policy anyone can request a login code, but the app refuses every email that is neither an admin nor a listed client. A deployed database starts empty: projects, grids and client reports from a local copy don't carry over.

## What clients can and can't do

Every server function and API route (including the MCP server) refuses client accounts, except the read-only Local Grid and portal functions, which are also limited to the client's own projects. This is enforced on the server, not just hidden in the UI. A test fails the build if new code reads a user without going through that check.

## Testing locally

Locally there is no Cloudflare login, so set `LOCAL_PREVIEW_AS_CLIENT=client@example.com` in `.env.local` (only honoured with `AUTH_MODE=local_noauth`), add that email under Client access, and restart. The app then behaves as that client: `/` redirects to the portal and every admin function is refused. Remove the line to go back to admin.
