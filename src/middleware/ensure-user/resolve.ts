import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { PortalRepository } from "@/server/features/portal/PortalRepository";
import { getAuthMode, isHostedAuthMode } from "@/lib/auth-mode";
import { resolveCloudflareAccessContext } from "./cloudflareAccess";
import { resolveLocalNoAuthContext } from "./delegated";
import { resolveHostedContext } from "./hosted";
import type { EnsuredUserContext } from "./types";

// Resolves the user for a request, portal clients included. Only the server
// function middleware may use this; it hands clients to the read-only portal
// functions and refuses them everywhere else.
export async function resolveAnyUserContextFromHeaders(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const authMode = getAuthMode(env.AUTH_MODE);
  if (authMode === "local_noauth") {
    const context = await resolveLocalNoAuthContext();
    // Local testing only: act as a portal client to check what they can reach.
    const previewEmail = env.LOCAL_PREVIEW_AS_CLIENT?.trim().toLowerCase();
    if (!previewEmail) return context;
    return {
      ...context,
      userEmail: previewEmail,
      role: "client",
      portalProjectIds: await PortalRepository.projectIdsForEmail(previewEmail),
    };
  }
  if (isHostedAuthMode(authMode)) {
    return resolveHostedContext(headers);
  }
  return resolveCloudflareAccessContext(headers);
}

// For raw API routes, MCP and OAuth callbacks, which can't use function
// middleware. Portal clients never get through these.
export async function resolveUserContextFromHeaders(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const context = await resolveAnyUserContextFromHeaders(headers);
  if (context.role === "client") {
    throw new AppError("FORBIDDEN");
  }
  return context;
}
