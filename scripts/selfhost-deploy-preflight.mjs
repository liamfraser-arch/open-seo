// Fast checks before `pnpm deploy:selfhost` spends minutes on the build — a
// missing env value or Cloudflare login should fail in seconds instead.
// (Distinct from scripts/selfhost-preflight.ts, the Docker container-start
// preflight that validates the runtime environment.)
// Everything here is best-effort duplication of errors alchemy would raise
// later anyway; when in doubt (unreadable profile, API-token auth) it stays
// quiet and lets the deploy be the judge.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import chalk from "chalk";

const cmd = chalk.cyan;
const em = chalk.yellow;

const fail = (...lines) => {
  console.error(`\n${chalk.red("deploy:selfhost preflight failed:")}\n`);
  for (const line of lines) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
};

// The `alchemy` script needs --experimental-strip-types (Node 22.6+).
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 6)) {
  fail(
    `Node ${em(process.versions.node)} is too old — the deploy needs Node 22.6 or newer (24 LTS recommended).`,
  );
}

const envFile = ".env.selfhost";
if (!existsSync(envFile)) {
  fail(
    `${em(envFile)} not found — create it first:`,
    "",
    `  ${cmd("cp deploy/.env.selfhost.example .env.selfhost")}`,
    "",
    `then set ${em("DATAFORSEO_API_KEY")} and ${em("ACCESS_ALLOWED_EMAILS")}.`,
  );
}
const env = {};
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
  if (match) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
}
if (!env.DATAFORSEO_API_KEY) {
  fail(
    `${em("DATAFORSEO_API_KEY")} is not set in ${envFile} — see docs/DATAFORSEO_API_KEY.md for how to get one.`,
  );
}
// When both are set, the deploy provisions no Access resources (hand-managed
// application) and needs neither ACCESS_ALLOWED_EMAILS nor the access:write
// login scope.
const managedAccess = !(env.TEAM_DOMAIN && env.POLICY_AUD);
if (managedAccess && !env.ACCESS_ALLOWED_EMAILS) {
  fail(
    `${em("ACCESS_ALLOWED_EMAILS")} is not set in ${envFile} — list who may sign in through`,
    "Cloudflare Access (comma-separated emails), or set TEAM_DOMAIN and POLICY_AUD",
    "to manage the Access application yourself.",
  );
}

// With a hand-managed Access application anyone it admits can sign in, so the
// app needs ADMIN_EMAILS to tell admins from clients. Unset, everyone it admits
// would be an admin.
if (!managedAccess && !env.ADMIN_EMAILS) {
  fail(
    `${em("ADMIN_EMAILS")} is not set in ${envFile}. You manage the Access application`,
    "yourself (TEAM_DOMAIN and POLICY_AUD are set), so anyone it admits can sign in,",
    "and without ADMIN_EMAILS every one of them would get the full app.",
    "",
    `Set ${em("ADMIN_EMAILS")}=you@example.com (comma-separated). See docs/CLIENT_PORTAL.md.`,
  );
}
// The Access application the deploy creates only covers the workers.dev
// address, so a custom domain needs your own application.
if (env.CUSTOM_DOMAIN && managedAccess) {
  fail(
    `${em("CUSTOM_DOMAIN")} is set, but the Access application the deploy creates only`,
    "covers the workers.dev address. Create your own Access application for that",
    `hostname and set ${em("TEAM_DOMAIN")} and ${em("POLICY_AUD")} in ${envFile}.`,
    "See docs/CLIENT_PORTAL.md.",
  );
}

// An explicit API token bypasses login profiles entirely.
if (!process.env.CLOUDFLARE_API_TOKEN) {
  const profileName = process.env.ALCHEMY_PROFILE || "default";
  let cloudflare;
  try {
    cloudflare = JSON.parse(
      readFileSync(path.join(homedir(), ".alchemy", "profiles.json"), "utf8"),
    ).profiles?.[profileName]?.Cloudflare;
  } catch {
    cloudflare = undefined;
  }
  if (!cloudflare) {
    fail(
      `No Cloudflare login found (alchemy profile "${profileName}") — run ${cmd("pnpm alchemy login")}`,
      `first (answer yes to "Customize OAuth scopes?" and enable ${em("access:write")}).`,
    );
  }
  if (
    managedAccess &&
    cloudflare.method === "oauth" &&
    Array.isArray(cloudflare.scopes) &&
    !cloudflare.scopes.includes("access:write")
  ) {
    fail(
      `Your Cloudflare login is missing the ${em("access:write")} scope, which the deploy needs`,
      "to provision the Cloudflare Access login gate. Log in again with the scope enabled:",
      "",
      `  ${cmd("pnpm alchemy login --configure")}`,
      "",
      `When asked "Customize OAuth scopes?", answer yes, then select ${em("access:write")}`,
      "(space to toggle, enter to confirm — keep the preselected defaults).",
    );
  }
}
