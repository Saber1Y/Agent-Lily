import { NextRequest, NextResponse } from "next/server";

import { isT3nConfigured, getT3nCredentials } from "@/lib/t3n/index";
import { createBridgeAuthorization } from "@/lib/t3n/authorization";
import { hasAdminAuthorization } from "@/lib/agentApiAuth";

const SUPPORTED_CHAINS = [1, 10, 137, 42161, 8453, 43114];
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  42161: "Arbitrum",
  8453: "Base",
  43114: "Avalanche",
};

interface AuthorizeRequest {
  operatorPrivateKey: string;
  maxAmountPerBridge: string;
  allowedSourceChains: number[];
  allowedDestinationChains: number[];
  expiresInSeconds: number;
}

export async function GET() {
  return NextResponse.json(
    {
      status: "error",
      message: "Use POST to issue a new bridge authorization.",
    },
    { status: 405 },
  );
}

export async function POST(request: NextRequest) {
  if (!hasAdminAuthorization(request)) {
    return NextResponse.json(
      { status: "error", message: "Admin authorization required." },
      { status: 401 },
    );
  }

  if (!isT3nConfigured()) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "T3N is not configured. Set T3N_AGENT_API_KEY and T3N_AGENT_DID environment variables first.",
      },
      { status: 400 },
    );
  }

  let body: AuthorizeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!body.operatorPrivateKey?.startsWith("0x")) {
    return NextResponse.json(
      { status: "error", message: "operatorPrivateKey must be a hex string starting with 0x." },
      { status: 400 },
    );
  }

  const maxAmount = parseFloat(body.maxAmountPerBridge);
  if (isNaN(maxAmount) || maxAmount <= 0) {
    return NextResponse.json(
      { status: "error", message: "maxAmountPerBridge must be a positive number." },
      { status: 400 },
    );
  }

  const sourceChains = body.allowedSourceChains?.filter((c) => SUPPORTED_CHAINS.includes(c));
  if (!sourceChains?.length) {
    return NextResponse.json(
      { status: "error", message: `allowedSourceChains must include at least one supported chain: ${SUPPORTED_CHAINS.join(", ")}.` },
      { status: 400 },
    );
  }

  const destChains = body.allowedDestinationChains?.filter((c) => SUPPORTED_CHAINS.includes(c));
  if (!destChains?.length) {
    return NextResponse.json(
      { status: "error", message: `allowedDestinationChains must include at least one supported chain: ${SUPPORTED_CHAINS.join(", ")}.` },
      { status: 400 },
    );
  }

  const expiresIn = body.expiresInSeconds || 86400;

  const creds = getT3nCredentials();
  if (!creds) {
    return NextResponse.json(
      { status: "error", message: "T3N credentials not available." },
      { status: 500 },
    );
  }

  try {
    const operatorAddress = body.operatorPrivateKey
      ? getAddressFromPrivateKey(body.operatorPrivateKey)
      : null;

    if (!operatorAddress) {
      return NextResponse.json(
        { status: "error", message: "Could not derive address from operatorPrivateKey." },
        { status: 400 },
      );
    }

    const signed = createBridgeAuthorization({
      agentDid: creds.agentDid,
      operatorPrivateKey: body.operatorPrivateKey as `0x${string}`,
      operatorAddress,
      maxAmountPerBridge: body.maxAmountPerBridge,
      allowedSourceChains: sourceChains,
      allowedDestinationChains: destChains,
      expiresInSeconds: expiresIn,
    });

    const serialized = JSON.stringify({
      authorization: signed.authorization,
      signatureHex: signed.signatureHex,
      signerAddress: signed.signerAddress,
    });

    return NextResponse.json({
      status: "success",
      message: "Bridge authorization issued.",
      authorization: {
        agentDid: creds.agentDid,
        operatorAddress,
        maxAmountPerBridge: body.maxAmountPerBridge,
        allowedSourceChains: sourceChains.map((c) => ({ id: c, name: CHAIN_NAMES[c] || `Chain ${c}` })),
        allowedDestinationChains: destChains.map((c) => ({ id: c, name: CHAIN_NAMES[c] || `Chain ${c}` })),
        issuedAt: new Date(signed.authorization.issuedAt * 1000).toISOString(),
        expiresAt: new Date(signed.authorization.expiresAt * 1000).toISOString(),
        nonce: signed.authorization.nonce,
        signerAddress: signed.signerAddress,
        signatureHex: signed.signatureHex,
      },
      envVar: {
        key: "T3N_BRIDGE_AUTH",
        value: serialized,
        instruction: "Add this to your .env.local file as T3N_BRIDGE_AUTH=<value>",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to issue authorization.",
      },
      { status: 500 },
    );
  }
}

function getAddressFromPrivateKey(privateKey: string): string | null {
  try {
    const { privateKeyToAccount } = require("viem/accounts");
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return account.address;
  } catch {
    return null;
  }
}
