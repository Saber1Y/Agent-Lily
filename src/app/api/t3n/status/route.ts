import { NextResponse } from "next/server";

import { getT3nStatus, isT3nConfigured } from "@/lib/t3n/index";
import { isT3nAuthorized, readT3nSecrets, getStoredAuthorization, recoverSigner } from "@/lib/t3n/authorization";

export async function GET() {
  try {
    const configured = isT3nConfigured();
    const status = await getT3nStatus();
    const authorized = isT3nAuthorized();
    const secrets = readT3nSecrets();
    const auth = getStoredAuthorization();

    let signerAddress: string | null = null;
    if (auth) {
      const recovered = await recoverSigner(auth);
      signerAddress = recovered.address;
    }

    return NextResponse.json({
      configured,
      connected: status.connected,
      sessionId: status.sessionId,
      environment: status.environment,
      agentDid: secrets?.agentDid ?? null,
      authorized,
      authorization: auth
        ? {
            issuedAt: new Date(auth.authorization.issuedAt * 1000).toISOString(),
            expiresAt: new Date(auth.authorization.expiresAt * 1000).toISOString(),
            maxAmountPerBridge: auth.authorization.maxAmountPerBridge,
            allowedSourceChains: auth.authorization.allowedSourceChains,
            allowedDestinationChains: auth.authorization.allowedDestinationChains,
            signerAddress,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: isT3nConfigured(),
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
