# SerpSurfers

An SEO toolkit for agencies and consultants, with a branded, read-only dashboard you can give to clients.

It combines keyword research, rank tracking, Google Maps rank grids, site audits and AI-search tracking in one app, and lets you share a live view of a project with a client who signs in with their email.

SerpSurfers is built on [OpenSEO](https://github.com/every-app/open-seo) (MIT licensed, by Ben Senescu). The rebrand, the Local Grid, and the client portal are additions on top of it. See [Credits and license](#credits-and-license).

## Contents

- [How it works](#how-it-works)
- [What you can do](#what-you-can-do)
- [The client portal](#the-client-portal)
- [Running it locally](#running-it-locally)
- [Configuration](#configuration)
- [Deploying](#deploying)
- [Costs](#costs)
- [Project layout](#project-layout)
- [Known limits](#known-limits)
- [Credits and license](#credits-and-license)

## How it works

```
 You (admin)                         Client
     │                                  │
     │  full app                        │  /portal (read-only)
     ▼                                  ▼
┌────────────────────────────────────────────────┐
│  Cloudflare Access login (emailed code)        │
└────────────────────────────────────────────────┘
     │                                  │
     ▼                                  ▼
┌────────────────────────────────────────────────┐
│  SerpSurfers app (React + TanStack Start)      │
│  one role check on every request:              │
│  admin → everything · client → own project only│
└────────────────────────────────────────────────┘
     │                    │                │
     ▼                    ▼                ▼
 Database           DataForSEO        Google Search
 (D1 / Postgres)    (rank + SERP data) Console (clicks)
```

- **Projects.** Everything is organised by project, usually one per client website. A project has a market (country and language) and its own keywords, rank tracking, grids and reports.
- **Data comes from DataForSEO.** Keyword volumes, rankings, backlinks, audits and Google Maps results are fetched from [DataForSEO](https://dataforseo.com) with your own API key. You pay them directly, per request. Nothing is charged until you run something.
- **Clicks and impressions come from Google Search Console.** It's free and first-party. You connect it per project.
- **Sign-in is Cloudflare Access.** People get a one-time code by email. The app then decides what each person may see.
- **Two kinds of people.** _Admins_ (you and your team) get the full app. _Clients_ get only the portal for the project they were added to. This is enforced on the server for every request, not just hidden in the UI. See [The client portal](#the-client-portal).
- **Storage.** Cloudflare D1 (SQLite) by default, or Postgres for larger installs. Migrations are kept for both.
- **Hosting.** Cloudflare Workers, with Docker available for a private local setup.

## What you can do

Everything below is in the sidebar of a project.

### Research

| Tool                 | What it does                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Keyword Research** | Find keywords from seed terms with search volume, difficulty, CPC and intent. Save promising ones. |
| **Saved Keywords**   | Your shortlist, with tags, ready to cluster or track.                                              |
| **Domain Overview**  | Any domain's SEO profile: traffic, ranking keywords and backlinks.                                 |
| **Backlinks**        | Who links to a site, what changed recently, and which pages attract links.                         |

### Tracking

| Tool              | What it does                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rank Tracking** | Track keyword positions over time on a schedule, by country, language and device (desktop or mobile).                                                    |
| **Local Grid**    | See where a business ranks on Google Maps across its whole area. See [below](#local-grid).                                                               |
| **GSC Insights**  | Clicks, impressions, CTR and position from Search Console, with the previous period for comparison and "striking distance" keywords (positions 5 to 20). |
| **Site Audit**    | Crawl a site and list technical issues page by page.                                                                                                     |

### AI search

| Tool                | What it does                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Prompt Research** | Find the questions people ask AI about a market and which sites get cited in the answers.                         |
| **Prompt Tracking** | Track whether and how often a brand is mentioned or cited in AI answers, over time.                               |
| **Prompt Explorer** | Ask any prompt across ChatGPT, Claude, Gemini and Perplexity side by side, and see the answers and their sources. |

### Reporting and AI

| Tool            | What it does                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Reports**     | Write findings up as a report (templates included) and share it with a link.                                          |
| **Context**     | A project's shared memory (business, goals, competitors) used to ground AI work.                                      |
| **Agent setup** | Connect an AI agent (Claude Code, ChatGPT and others) to the app's tools through MCP, so it can run research for you. |

### Local Grid

A Local Grid answers "where does this business show up on Google Maps, and where doesn't it?"

1. Pick a business and a keyword, for example _HVAC contractor_.
2. Choose a grid size (3×3, 5×5, 7×7 or 9×9) and the spacing between points (0.25 to 10 km).
3. The app searches Google Maps for the keyword from every point on the grid, and records the business's rank at each point.
4. You get a map of coloured pins (green for the top 3, then amber, orange, red for not found), plus the average rank, the share of points in the top 3, the number in the top 10, and the number found.
5. Click any pin to see who ranks at that exact spot.

Each run is saved. **Run again** later, then **Compare**: pick any two dates and see both grids side by side, with every pin on the later grid showing how far it moved. The summary cards show the change in each number, in green or red.

A grid costs roughly 0.12 cents per point at DataForSEO's price, so a 5×5 grid is about 3 cents. The map background needs a Google Maps key (optional; without it the grid draws on a plain background).

## The client portal

The portal is what you send to a client. It's a live, read-only dashboard for one project, with your SerpSurfers branding.

### What the client sees

They sign in with their email, get a one-time code, and land on `/portal`. There are four tabs.

| Tab           | Contents                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**  | The plan summary, "Month X of 6", percent of the plan completed, and milestones reached. Then the **Wins** charts (below), a **Visitors from Google** card, and a **Local visibility** graph. |
| **Strategy**  | The 6-month plan as six month cards. Each step is marked _Done_, _In progress_ or _Up next_. The current month is highlighted.                                                                |
| **Keywords**  | Keyword groups ("clusters"). Each keyword shows monthly searches, its rank at the start, its rank now, and the places gained. A keyword that wasn't ranking before shows _New_.               |
| **Local map** | Their Local Grid with the date Compare. Read-only: no Run, no Delete.                                                                                                                         |

The **Wins** are charts, not lists:

- **Headline tiles:** keywords on page 1 (then and now), keywords improved, and the change in Google visitors.
- **Where each keyword moved:** one row per keyword with a hollow dot for the start rank and a filled dot for now. Further right is better. Drops show in red.
- **Where your keywords rank:** two stacked bars, _Start_ and _Now_, split into top 3, 4 to 10, 11 to 20, 21 to 50, 51 to 100 and not ranking.
- **Milestones reached:** the wins you add, as a dated timeline.

**Visitors from Google** shows clicks and impressions for the last 3 months against the previous 3 months, or against the same 3 months a year earlier (a toggle), with a monthly bar chart. It uses Search Console and is hidden if Search Console isn't connected. The **Local visibility** graph plots the share of the area where the business is in the Maps top 3, run by run, with one line per tracked keyword.

### What you do

- **Add a client.** Open the project, then **Settings → General → Client access**, type their email, and click Add. Remove them the same way. A client can be attached to more than one project.
- **Write their dashboard.** Open **Settings → Client report** and fill in:
  - a start date and one-line summary;
  - the 6-month plan (steps by month, with a status);
  - keyword groups, each keyword with its monthly searches, start rank and current rank;
  - wins, with a date.
    Everything saves at once with **Save client report**.
- **Preview.** **Preview what they see** (on the Client access card) opens the portal as a client would see it.
- **Sample data.** Add `?demo=1` to a portal URL to see it filled with made-up numbers. It works for admins only, runs in the browser and is never saved, so it can't reach a real client.

### What stays automatic and what doesn't

| Part                               | How it updates                                                     |
| ---------------------------------- | ------------------------------------------------------------------ |
| Local map and the visibility graph | When a grid run finishes. Runs are started by you (**Run again**). |
| Visitors from Google               | From Search Console on every page load.                            |
| Plan, keyword ranks and wins       | Only when you edit them.                                           |

The portal always shows what is in the database when the client opens or refreshes the page. It doesn't push changes to a page that's already open.

### How clients are kept out of everything else

A client is a separate role. The server refuses a client on **every** server function, API route and the MCP server, except a short list of read-only portal and Local Grid functions, and those are limited to the client's own projects. Asking for another project returns "not found". A test fails the build if new code reads a user without going through this check.

- `ADMIN_EMAILS` (comma-separated) says who gets the full app. Once it's set, any signed-in email that is neither an admin nor a listed client is refused.
- **Without `ADMIN_EMAILS`, everyone Access lets in is an admin.** Never pair an "Everyone" Access policy with it unset.

See [`docs/CLIENT_PORTAL.md`](./docs/CLIENT_PORTAL.md) for setup and testing.

## Running it locally

You need Node 22 or newer and [pnpm](https://pnpm.io). The version pnpm should use is set in `package.json`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local        # then edit it, see Configuration
pnpm run db:migrate:local         # create the local database (once, and after pulling new migrations)
pnpm dev                          # http://localhost:3001
```

A minimal `.env.local` for local work:

```sh
AUTH_MODE=local_noauth            # no login; you are an admin called admin@localhost
DATAFORSEO_API_KEY=...            # see docs/DATAFORSEO_API_KEY.md
GOOGLE_MAPS_API_KEY=...           # optional: map behind the Local Grid
OPENSEO_TELEMETRY_DISABLED=1
```

`local_noauth` has no login, so only run it on your own machine.

### Testing the client experience locally

There is no Cloudflare login locally, so add one more line to act as a client:

```sh
LOCAL_PREVIEW_AS_CLIENT=client@example.com
```

Add that email under a project's **Client access**, restart, and the app behaves as that client: `/` redirects to the portal and every admin function is refused. Remove the line to go back to admin.

### Useful commands

```sh
pnpm test            # unit tests
pnpm types:check     # TypeScript
pnpm lint            # oxlint
pnpm format:check    # prettier
pnpm db:generate     # new migrations, after changing a schema (both SQLite and Postgres)
```

## Configuration

| Variable                                                         | Needed for                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_MODE`                                                      | `local_noauth` (local), `cloudflare_access` (deployed), or `hosted` (not used here). Defaults to `cloudflare_access`.                                                |
| `DATAFORSEO_API_KEY`                                             | All paid SEO data. Base64 of `login:password`.                                                                                                                       |
| `GOOGLE_MAPS_API_KEY`                                            | The map behind the Local Grid. Restrict it to your domains. Optional.                                                                                                |
| `GOOGLE_MAPS_MAP_ID`                                             | Custom map styling. Optional; defaults to Google's demo map.                                                                                                         |
| `TEAM_DOMAIN`, `POLICY_AUD`                                      | Cloudflare Access, when you manage the Access app yourself.                                                                                                          |
| `ADMIN_EMAILS`                                                   | Who gets the full app in Access mode. **Required if clients sign in.**                                                                                               |
| `LOCAL_PREVIEW_AS_CLIENT`                                        | Local testing only. Acts as that client email.                                                                                                                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` | Connecting Google Search Console (needed for the portal's clicks). See [`docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md`](./docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md). |
| `OPENSEO_TELEMETRY_DISABLED`                                     | Set to `1` to turn off the upstream usage heartbeat.                                                                                                                 |

Keep keys in `.env.local` (git-ignored). Never commit them.

## Deploying

For clients to sign in, deploy to Cloudflare and manage Access yourself.

1. Follow [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md) to provision Workers, D1, KV and R2 (works on Cloudflare's free plan; R2 needs a payment method on file).
2. Create a self-hosted Access application for your hostname with an **Allow: Everyone** policy and **One-time PIN** login, and put its `TEAM_DOMAIN` and `POLICY_AUD` in `.env.selfhost`. (The one-command deploy otherwise locks Access to a fixed email list, so adding a client would need a redeploy.)
3. Set `ADMIN_EMAILS` to your own address.
4. Add each client's email in the app. No redeploy needed.
5. Send them the app URL.

[`docs/CLIENT_PORTAL.md`](./docs/CLIENT_PORTAL.md) has the full steps. After the first deploy, sign in with a second email you control as a test client, since the real Access login can't be tested locally.

A Docker setup also exists for private use: [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md). It runs with login disabled, so it is not suitable for clients.

## Costs

- **DataForSEO:** pay per request, directly. New accounts include $1 of free credit; the minimum top-up is $50. A 5×5 Local Grid costs about 3 cents. The app shows the cost before it runs anything.
- **Google Search Console:** free.
- **Google Maps:** a billing account is required, with a monthly free allowance that light use rarely exceeds.
- **Cloudflare:** the free plan works; Access is free for up to 50 users.

## Project layout

```
src/
  routes/            pages (TanStack Router, file-based): /p/<project>/…, /portal/…
  client/features/   UI by feature: local-grid, portal, rank-tracking, …
  serverFunctions/   the server API; every function declares who may call it
  server/features/   business logic and data access, by feature
  middleware/        who is calling: admin, client, or refused
  db/                database schemas (SQLite and Postgres)
  shared/            code used by both sides, including portal maths and tests
drizzle/             migrations (sqlite/ and pg/)
docs/                setup guides
```

Where to look for each part of the client portal:

| Part                                     | Files                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Who is a client, and what they may reach | `src/middleware/ensure-user/`, `src/serverFunctions/middleware.ts`             |
| The portal pages                         | `src/routes/portal.*`, `src/client/features/portal/`                           |
| The admin editor and Client access card  | `src/client/features/portal/ClientReportEditor.tsx`, `ClientAccessSection.tsx` |
| Clicks, wins and rank maths              | `src/shared/portal-traffic.ts`, `src/shared/portal-content.ts`                 |
| Local Grid                               | `src/client/features/local-grid/`, `src/server/features/local-grid/`           |

## Known limits

- **Rank numbers in the portal are typed in by you.** Only the map graph and Google visitors update on their own. Syncing the keyword ranks from the rank tracker is not built.
- **Grids don't run on a schedule yet.** A new run happens when you start one.
- **Visitors from Google needs Search Console connected** for that project, and Google keeps about 16 months of history, which caps the year-on-year comparison.
- **The portal shows the Local Grid only** for maps. Rank tracking and the other tools are admin-only.
- **Some help links** inside the app still point at the upstream OpenSEO documentation, because those pages don't exist on your domain.

## Credits and license

SerpSurfers is a fork of [OpenSEO](https://github.com/every-app/open-seo), copyright (c) 2026 Ben Senescu, released under the MIT License. That copyright notice must stay with the code. See [`LICENSE`](./LICENSE).
