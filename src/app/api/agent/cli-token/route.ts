import { NextRequest, NextResponse } from "next/server";

import { getAgentApiSecret, hasAdminAuthorization } from "@/lib/agentApiAuth";
import { issueCliToken } from "@/lib/cliAuth";

export async function POST(request: NextRequest) {
  if (!hasAdminAuthorization(request)) {
    return NextResponse.json(
      {
        status: "error",
        message: getAgentApiSecret()
          ? "Unauthorized agent request."
          : "AGENT_API_SECRET or CRON_SECRET is not configured.",
      },
      { status: getAgentApiSecret() ? 401 : 503 },
    );
  }

  const token = issueCliToken();
  if (!token) {
    return NextResponse.json(
      {
        status: "error",
        message: "AGENT_API_SECRET or CRON_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ok",
    ...token,
  });
}
