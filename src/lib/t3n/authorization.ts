import {
  buildDelegationCredential,
  signCredential,
  ethRecoverEip191,
  eip191Digest,
  validateCredentialBody,
  type DelegationCredential,
} from "@terminal3/t3n-sdk";
import { serverEnv } from "@/env/server";
import {
  type BridgeAuthorization,
  type SignedBridgeAuthorization,
  type AuthCheckResult,
  type T3nSecrets,
} from "./types";

const AUTH_VERSION = "lily-bridge-auth-v1";

export function readT3nSecrets(): T3nSecrets | null {
  const apiKey = serverEnv.t3nAgentApiKey;
  const agentDid = serverEnv.t3nAgentDid;
  const operatorAddress = serverEnv.t3nOperatorAddress;
  const baseUrl = serverEnv.t3nBaseUrl;

  if (!apiKey || !agentDid || !operatorAddress) {
    return null;
  }

  return { agentApiKey: apiKey, agentDid, operatorAddress, baseUrl: baseUrl || "https://testnet.terminal3.io" };
}

export function getStoredAuthorization(): SignedBridgeAuthorization | null {
  const raw = serverEnv.t3nBridgeAuth;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    const auth: BridgeAuthorization = {
      version: parsed.authorization.version,
      agentDid: parsed.authorization.agentDid,
      operatorAddress: parsed.authorization.operatorAddress,
      issuedAt: parsed.authorization.issuedAt,
      expiresAt: parsed.authorization.expiresAt,
      maxAmountPerBridge: parsed.authorization.maxAmountPerBridge,
      allowedSourceChains: parsed.authorization.allowedSourceChains,
      allowedDestinationChains: parsed.authorization.allowedDestinationChains,
      nonce: parsed.authorization.nonce,
    };

    return {
      authorization: auth,
      signatureHex: parsed.signatureHex,
      signerAddress: parsed.signerAddress,
    };
  } catch {
    console.error("Failed to parse stored T3N bridge authorization");
    return null;
  }
}

function authorizationToJcs(auth: BridgeAuthorization): Uint8Array {
  const canonical = JSON.stringify({
    version: auth.version,
    agentDid: auth.agentDid,
    operatorAddress: auth.operatorAddress,
    issuedAt: auth.issuedAt,
    expiresAt: auth.expiresAt,
    maxAmountPerBridge: auth.maxAmountPerBridge,
    allowedSourceChains: auth.allowedSourceChains.sort((a, b) => a - b),
    allowedDestinationChains: auth.allowedDestinationChains.sort((a, b) => a - b),
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
        error: `Authorization signed by ${recoveredHex}, expected ${expectedOperatorAddress}`,
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
): AuthCheckResult {
  const secrets = readT3nSecrets();
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

  const signed = getStoredAuthorization();
  if (!signed) {
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

  const { valid, error } = verifyAuthorization(signed, secrets.operatorAddress);
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

  const auth = signed.authorization;
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
    const chainNames: Record<number, string> = {
      1: "Ethereum", 10: "Optimism", 137: "Polygon",
      42161: "Arbitrum", 8453: "Base", 43114: "Avalanche",
    };
    const fromName = chainNames[fromChainId] || `chain ${fromChainId}`;
    const toName = chainNames[toChainId] || `chain ${toChainId}`;
    return {
      authorized: false,
      reason: `Bridge from ${fromName} to ${toName} not in authorized chain set. Allowed sources: ${auth.allowedSourceChains.join(", ")}. Allowed destinations: ${auth.allowedDestinationChains.join(", ")}.`,
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
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
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

export function isT3nAuthorized(): boolean {
  return !!readT3nSecrets() && !!getStoredAuthorization();
}
