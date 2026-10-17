# Client portal

Give a client a login to a live, read-only dashboard of their own project.

## How it works

- Clients sign in through Cloudflare Access (an emailed one-time code).
- A client email is attached to one or more projects under **Project → Settings → General → Client access**.
- Clients land on `/portal` and see only those projects. They get no sidebar and no settings, and they can't run anything that costs credits.
- You edit what they see under **Project → Settings → Client report**: the 6-month plan, keyword groups with ranks, and wins.
- Staff can preview exactly what a client sees at `/portal/<projectId>`, and add `?demo=1` to see sample data (staff only, never saved).

## Setup (Cloudflare self-hosting)

The one-command deploy (`pnpm deploy:selfhost`) creates an Access policy that allows only `ACCESS_ALLOWED_EMAILS`, so adding a client would mean redeploying. For client logins, manage Access yourself and let the app decide who gets in:

1. In Cloudflare Zero Trust, create a self-hosted Access application for the app's hostname. Add an **Allow** policy that includes **Everyone**, with **One-time PIN** as the login method. Cloudflare checks the person owns the email; the app decides what they can see.
2. In `.env.selfhost`, set `TEAM_DOMAIN` and `POLICY_AUD` from that Access application, so the deploy does not create its own Access resources.
3. **Set `ADMIN_EMAILS`** to a comma-separated list of the people who get the full app, for example `ADMIN_EMAILS=you@serpsurfers.com`. With it set, any signed-in email that is neither an admin nor a listed client is refused. **Without it, everyone Access lets in is an admin**, so never combine an "Everyone" policy with an unset `ADMIN_EMAILS`.
4. Add each client's email under Project → Settings → General → Client access. No redeploy is needed.
5. Send the client `https://app.serpsurfers.com`. They enter their email, get a code, and land on their dashboard.

## What clients can and can't do

Every server function and API route (including the MCP server) refuses client accounts, except the read-only Local Grid and portal functions, which are also limited to the client's own projects. This is enforced on the server, not just hidden in the UI. A test fails the build if new code reads a user without going through that check.

## Testing locally

Locally there is no Cloudflare login, so set `LOCAL_PREVIEW_AS_CLIENT=client@example.com` in `.env.local` (only honoured with `AUTH_MODE=local_noauth`), add that email under Client access, and restart. The app then behaves as that client: `/` redirects to the portal and every admin function is refused. Remove the line to go back to admin.
