import {
  signCredential,
  ethRecoverEip191,
  eip191Digest,
} from "@terminal3/t3n-sdk";
import {
  type BridgeAuthorization,
  type SignedBridgeAuthorization,
  type AuthCheckResult,
  type T3nSecrets,
} from "./types";

const AUTH_VERSION = "lily-bridge-auth-v1";

function authorizationToJcs(auth: BridgeAuthorization): Uint8Array {
  const canonical = JSON.stringify({
    version: auth.version,
    agentDid: auth.agentDid,
    operatorAddress: auth.operatorAddress,
    issuedAt: auth.issuedAt,
    expiresAt: auth.expiresAt,
    maxAmountPerBridge: auth.maxAmountPerBridge,
    allowedSourceChains: [...auth.allowedSourceChains].sort((a, b) => a - b),
    allowedDestinationChains: [...auth.allowedDestinationChains].sort((a, b) => a - b),
    nonce: auth.nonce,
  });
  return new TextEncoder().encode(canonical);
}

export function verifyAuthorization(
  signed: SignedBridgeAuthorization,
  expectedOperatorAddress: string,
): { valid: boolean; error?: string } {
  try {
    const jcs = authorizationToJcs(signed.authorization);
    const digest = eip191Digest(jcs);
    const signatureBytes = hexToBytes(signed.signatureHex);

    const recoveredAddress = ethRecoverEip191(digest, signatureBytes);
    const recoveredHex = bytesToHex(recoveredAddress);

    if (recoveredHex.toLowerCase() !== expectedOperatorAddress.toLowerCase()) {
      return {
        valid: false,
        error: `Authorization signed by 0x${recoveredHex}, expected ${expectedOperatorAddress}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Authorization verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function checkBridgeAuthorization(
  fromChainId: number,
  toChainId: number,
  amount: string,
  secrets: T3nSecrets | null,
  storedAuth: SignedBridgeAuthorization | null,
): AuthCheckResult {
  if (!secrets) {
    return {
      authorized: false,
      reason: "T3N not configured. Set T3N_AGENT_API_KEY, T3N_AGENT_DID, and T3N_OPERATOR_ADDRESS.",
      operatorAddress: null,
      signedByExpectedOperator: false,
      isExpired: false,
      amountWithinLimit: false,
      chainsAllowed: false,
      expiresAt: null,
    };
  }

  if (!storedAuth) {
    return {
      authorized: false,
      reason: "No bridge authorization found. Issue one via the operator console or /api/t3n/authorize.",
      operatorAddress: secrets.operatorAddress,
      signedByExpectedOperator: false,
      isExpired: false,
      amountWithinLimit: false,
      chainsAllowed: false,
      expiresAt: null,
    };
  }

  const { valid, error } = verifyAuthorization(storedAuth, secrets.operatorAddress);
  if (!valid) {
    return {
      authorized: false,
      reason: `Authorization signature invalid: ${error}`,
      operatorAddress: secrets.operatorAddress,
      signedByExpectedOperator: false,
      isExpired: false,
      amountWithinLimit: false,
      chainsAllowed: false,
      expiresAt: null,
    };
  }

  const auth = storedAuth.authorization;
  const now = Math.floor(Date.now() / 1000);
  const expired = now > auth.expiresAt;
  const amountNum = parseFloat(amount);
  const maxAmountNum = parseFloat(auth.maxAmountPerBridge);
  const amountOk = !isNaN(amountNum) && !isNaN(maxAmountNum) && amountNum <= maxAmountNum;
  const sourceOk = auth.allowedSourceChains.includes(fromChainId);
  const destOk = auth.allowedDestinationChains.includes(toChainId);
  const chainsOk = sourceOk && destOk;

  if (expired) {
    return {
      authorized: false,
      reason: `Bridge authorization expired at ${new Date(auth.expiresAt * 1000).toISOString()}. Issue a new one.`,
      operatorAddress: secrets.operatorAddress,
      signedByExpectedOperator: true,
      isExpired: true,
      amountWithinLimit: amountOk,
      chainsAllowed: chainsOk,
      expiresAt: auth.expiresAt,
    };
  }

  if (!amountOk) {
    return {
      authorized: false,
      reason: `Bridge amount ${amount} USDC exceeds authorized maximum of ${auth.maxAmountPerBridge} USDC per bridge.`,
      operatorAddress: secrets.operatorAddress,
      signedByExpectedOperator: true,
      isExpired: false,
      amountWithinLimit: false,
      chainsAllowed: chainsOk,
      expiresAt: auth.expiresAt,
    };
  }

  if (!chainsOk) {
    return {
      authorized: false,
      reason: `Bridge from chain ${fromChainId} to ${toChainId} not in authorized set. Allowed sources: ${auth.allowedSourceChains.join(", ")}. Allowed destinations: ${auth.allowedDestinationChains.join(", ")}.`,
      operatorAddress: secrets.operatorAddress,
      signedByExpectedOperator: true,
      isExpired: false,
      amountWithinLimit: amountOk,
      chainsAllowed: false,
      expiresAt: auth.expiresAt,
    };
  }

  return {
    authorized: true,
    reason: `Authorization valid. Signed by operator ${secrets.operatorAddress}. Expires ${new Date(auth.expiresAt * 1000).toISOString()}.`,
    operatorAddress: secrets.operatorAddress,
    signedByExpectedOperator: true,
    isExpired: false,
    amountWithinLimit: true,
    chainsAllowed: true,
    expiresAt: auth.expiresAt,
  };
}

export function createBridgeAuthorization(
  params: {
    agentDid: string;
    operatorPrivateKey: `0x${string}`;
    operatorAddress: string;
    maxAmountPerBridge: string;
    allowedSourceChains: number[];
    allowedDestinationChains: number[];
    expiresInSeconds: number;
  },
): SignedBridgeAuthorization {
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(nonceBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      nonceBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, "0")).join("");

  const auth: BridgeAuthorization = {
    version: AUTH_VERSION,
    agentDid: params.agentDid,
    operatorAddress: params.operatorAddress,
    issuedAt: now,
    expiresAt: now + params.expiresInSeconds,
    maxAmountPerBridge: params.maxAmountPerBridge,
    allowedSourceChains: params.allowedSourceChains,
    allowedDestinationChains: params.allowedDestinationChains,
    nonce,
  };

  const jcs = authorizationToJcs(auth);
  const secretKey = hexToBytes(params.operatorPrivateKey.replace("0x", ""));

  const { sig, addr } = signCredential(jcs, secretKey);
  const signatureHex = bytesToHex(sig);
  const signerAddress = bytesToHex(addr);

  return {
    authorization: auth,
    signatureHex: `0x${signatureHex}`,
    signerAddress: `0x${signerAddress}`,
  };
}

export function parseStoredAuthorization(raw: string): SignedBridgeAuthorization | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      authorization: {
        version: parsed.authorization.version,
        agentDid: parsed.authorization.agentDid,
        operatorAddress: parsed.authorization.operatorAddress,
        issuedAt: parsed.authorization.issuedAt,
        expiresAt: parsed.authorization.expiresAt,
        maxAmountPerBridge: parsed.authorization.maxAmountPerBridge,
        allowedSourceChains: parsed.authorization.allowedSourceChains,
        allowedDestinationChains: parsed.authorization.allowedDestinationChains,
        nonce: parsed.authorization.nonce,
      },
      signatureHex: parsed.signatureHex,
      signerAddress: parsed.signerAddress,
    };
  } catch {
    return null;
  }
}

export function isAuthorizationExpired(auth: BridgeAuthorization): boolean {
  return Math.floor(Date.now() / 1000) > auth.expiresAt;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace("0x", "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
