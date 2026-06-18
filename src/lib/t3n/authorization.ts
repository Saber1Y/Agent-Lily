import { type T3nSecrets, type SignedBridgeAuthorization } from "./types";
import {
  checkBridgeAuthorization as coreCheck,
  createBridgeAuthorization as coreCreate,
  parseStoredAuthorization,
  recoverSigner,
} from "./authCore";

export { recoverSigner, parseStoredAuthorization };
export { createBridgeAuthorization } from "./authCore";

export function readT3nSecrets(): T3nSecrets | null {
  const apiKey = typeof process !== "undefined" ? process.env.T3N_AGENT_API_KEY : undefined;
  const agentDid = typeof process !== "undefined" ? process.env.T3N_AGENT_DID : undefined;
  const baseUrl = (typeof process !== "undefined" ? process.env.T3N_BASE_URL : undefined) || "https://testnet.terminal3.io";

  if (!apiKey || !agentDid) {
    return null;
  }

  return { agentApiKey: apiKey, agentDid, baseUrl };
}

export function getStoredAuthorization(storedAuthOverride?: string | null): SignedBridgeAuthorization | null {
  const raw = storedAuthOverride ?? (typeof process !== "undefined" ? process.env.T3N_BRIDGE_AUTH : undefined);
  if (!raw) return null;

  return parseStoredAuthorization(raw);
}

export async function checkBridgeAuthorization(
  fromChainId: number,
  toChainId: number,
  amount: string,
  storedAuthOverride?: string | null,
) {
  const secrets = readT3nSecrets();
  const storedAuth = getStoredAuthorization(storedAuthOverride);
  return coreCheck(fromChainId, toChainId, amount, secrets, storedAuth);
}

export function isT3nAuthorized(): boolean {
  return !!readT3nSecrets() && !!getStoredAuthorization();
}

export function isT3nConfigured(): boolean {
  return !!readT3nSecrets();
}
