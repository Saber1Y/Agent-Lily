import type { NextRequest } from "next/server";
import { isValidCliToken } from "./cliAuth";

export function getAgentApiSecret() {
  return process.env.AGENT_API_SECRET || process.env.CRON_SECRET || null;
}

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export function hasAdminAuthorization(request: NextRequest) {
  const secret = getAgentApiSecret();
  if (!secret) {
    return false;
  }

  return getBearerToken(request) === secret;
}

export function isAuthorizedAgentRequest(request: NextRequest) {
  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    return false;
  }

  return hasAdminAuthorization(request) || isValidCliToken(bearerToken);
}
