import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Portal clients must be refused by every entry point except the read-only
// portal functions. resolveAnyUserContextFromHeaders hands clients through and
// the delegated resolvers return them as-is, so only the files below may use
// them. Everything else goes through resolveUserContextFromHeaders, which
// refuses clients.
const UNGUARDED =
  /resolveAnyUserContextFromHeaders|resolveCloudflareAccessContext|resolveLocalNoAuthContext|resolveSharedWorkspaceContext/;
const ALLOWED = new Set([
  "middleware/ensureUser.ts",
  "middleware/ensure-user/resolve.ts",
  "middleware/ensure-user/cloudflareAccess.ts",
  "middleware/ensure-user/delegated.ts",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("portal client boundary", () => {
  it("only the resolver files use the unguarded user resolvers", () => {
    const root = join(process.cwd(), "src");
    const offenders = sourceFiles(root)
      .map((file) => file.slice(root.length + 1))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => UNGUARDED.test(readFileSync(join(root, file), "utf8")));
    expect(offenders).toEqual([]);
  });
});
