import { NextRequest, NextResponse } from "next/server";

import { recoverSigner, parseStoredAuthorization } from "@/lib/t3n/authorization";
import type { BridgeAuthorization } from "@/lib/t3n/types";
import { getStoredAgentConfig, saveAgentConfig } from "@/lib/persistence";

const SUPPORTED_CHAINS = [1, 10, 137, 42161, 8453, 84532, 43114];

interface SignedAuthRequest {
  authorization: BridgeAuthorization;
  signature: string;
}

export async function POST(request: NextRequest) {
  let body: SignedAuthRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { authorization, signature } = body;

  if (!authorization || !signature) {
    return NextResponse.json(
      { status: "error", message: "Both authorization and signature are required." },
      { status: 400 },
    );
  }

  if (!signature.startsWith("0x")) {
    return NextResponse.json(
      { status: "error", message: "signature must be a hex string starting with 0x." },
      { status: 400 },
    );
  }

  const amount = parseFloat(authorization.maxAmountPerBridge);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { status: "error", message: "maxAmountPerBridge must be a positive number." },
      { status: 400 },
    );
  }

  const sourceChains = (authorization.allowedSourceChains || []).filter((c) => SUPPORTED_CHAINS.includes(c));
  if (!sourceChains.length) {
    return NextResponse.json(
      { status: "error", message: `allowedSourceChains must include at least one supported chain.` },
      { status: 400 },
    );
  }

  const destChains = (authorization.allowedDestinationChains || []).filter((c) => SUPPORTED_CHAINS.includes(c));
  if (!destChains.length) {
    return NextResponse.json(
      { status: "error", message: `allowedDestinationChains must include at least one supported chain.` },
      { status: 400 },
    );
  }

  const signed = {
    authorization: {
      ...authorization,
      allowedSourceChains: sourceChains,
      allowedDestinationChains: destChains,
    },
    signatureHex: signature,
    signerAddress: authorization.operatorAddress,
  };

  const recovered = await recoverSigner(signed);
  if (!recovered.valid) {
    return NextResponse.json(
      { status: "error", message: `Signature verification failed: ${recovered.error}` },
      { status: 401 },
    );
  }

  if (recovered.address.toLowerCase() !== authorization.operatorAddress.toLowerCase()) {
    return NextResponse.json(
      {
        status: "error",
        message: `Authorization signed by ${recovered.address}, but authorization.operatorAddress is ${authorization.operatorAddress}. They must match.`,
      },
      { status: 400 },
    );
  }

  const serialized = JSON.stringify({
    authorization: signed.authorization,
    signatureHex: signed.signatureHex,
    signerAddress: signed.signerAddress,
  });

  const walletAddress = recovered.address.toLowerCase();
  let existingConfig = await getStoredAgentConfig(walletAddress);

  if (!existingConfig) {
    existingConfig = {
      id: walletAddress,
      walletAddress,
      currentChainId: 84532,
      positionUsdc: "0",
      autoRebalanceEnabled: false,
      t3nBridgeAuth: null,
    };
  }

  const updated = await saveAgentConfig({ ...existingConfig, t3nBridgeAuth: serialized });
  if (!updated) {
    console.warn("Signed T3N auth verified but failed to save to DB");
  }

  return NextResponse.json({
    status: "success",
    message: updated
      ? "Bridge authorization verified and saved to your agent config."
      : "Bridge authorization verified but failed to persist. Try again or set T3N_BRIDGE_AUTH in .env.local.",
    verified: true,
    operatorAddress: recovered.address,
    stored: !!updated,
    authorization: {
      maxAmountPerBridge: signed.authorization.maxAmountPerBridge,
      allowedSourceChains: signed.authorization.allowedSourceChains,
      allowedDestinationChains: signed.authorization.allowedDestinationChains,
      issuedAt: new Date(signed.authorization.issuedAt * 1000).toISOString(),
      expiresAt: new Date(signed.authorization.expiresAt * 1000).toISOString(),
    },
    envVarValue: serialized,
  });
}
