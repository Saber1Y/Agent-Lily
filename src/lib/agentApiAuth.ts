import type { NextRequest } from "next/server";

export function getAgentApiSecret() {
  return process.env.AGENT_API_SECRET || process.env.CRON_SECRET || null;
}

export function isAuthorizedAgentRequest(request: NextRequest) {
  const secret = getAgentApiSecret();
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

