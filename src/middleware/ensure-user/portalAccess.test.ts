import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCloudflareAccessContext } from "./cloudflareAccess";
import { resolveUserContextFromHeaders } from "./resolve";

const mocks = vi.hoisted(() => ({
  env: {
    AUTH_MODE: "cloudflare_access",
    TEAM_DOMAIN: "https://team.cloudflareaccess.com",
    POLICY_AUD: "aud",
    ADMIN_EMAILS: undefined as string | undefined,
  },
  email: "someone@example.com",
  projectIdsForEmail: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({ env: mocks.env }));
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: async () => ({ payload: { sub: "u1", email: mocks.email } }),
}));
vi.mock("@/server/features/portal/PortalRepository", () => ({
  PortalRepository: { projectIdsForEmail: mocks.projectIdsForEmail },
}));
vi.mock("./delegated", () => ({
  resolveSharedWorkspaceContext: async (userId: string, userEmail: string) => ({
    userId,
    userEmail,
    emailVerified: true,
    organizationId: "org-1",
    role: "owner",
  }),
  resolveLocalNoAuthContext: vi.fn(),
}));
vi.mock("./hosted", () => ({ resolveHostedContext: vi.fn() }));

const headers = new Headers({ "cf-access-jwt-assertion": "token" });

describe("portal client access", () => {
  beforeEach(() => {
    mocks.env.ADMIN_EMAILS = undefined;
    mocks.email = "someone@example.com";
    mocks.projectIdsForEmail.mockResolvedValue([]);
  });

  it("makes a listed client a limited user scoped to their projects", async () => {
    mocks.email = "Client@ColdFactor.com";
    mocks.projectIdsForEmail.mockResolvedValue(["project-a"]);

    await expect(
      resolveCloudflareAccessContext(headers),
    ).resolves.toMatchObject({
      role: "client",
      portalProjectIds: ["project-a"],
    });
    expect(mocks.projectIdsForEmail).toHaveBeenCalledWith(
      "client@coldfactor.com",
    );
  });

  it("never lets a client through the staff-only resolver used by API routes", async () => {
    mocks.projectIdsForEmail.mockResolvedValue(["project-a"]);

    await expect(resolveUserContextFromHeaders(headers)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("keeps a listed admin as admin even if they are also a client", async () => {
    mocks.env.ADMIN_EMAILS = "boss@example.com, someone@example.com";
    mocks.projectIdsForEmail.mockResolvedValue(["project-a"]);

    await expect(resolveUserContextFromHeaders(headers)).resolves.toMatchObject(
      {
        role: "owner",
      },
    );
  });

  it("refuses signed-in strangers once an admin list is set", async () => {
    mocks.env.ADMIN_EMAILS = "boss@example.com";

    await expect(resolveCloudflareAccessContext(headers)).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
  });

  it("without an admin list, admits everyone as before", async () => {
    await expect(
      resolveCloudflareAccessContext(headers),
    ).resolves.toMatchObject({ role: "owner" });
  });
});
