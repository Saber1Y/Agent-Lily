import {
  T3nClient,
  loadWasmComponent,
  setEnvironment,
  createDefaultHandlers,
  type WasmComponent,
} from "@terminal3/t3n-sdk";
import { serverEnv } from "@/env/server";
import { type T3nStatus } from "./types";

let client: T3nClient | null = null;
let wasmComponent: WasmComponent | null = null;
let sessionId: string | null = null;
let agentDid: string | null = null;
let connectionAttempted = false;

export function getT3nCredentials(): { apiKey: string; agentDid: string; baseUrl: string } | null {
  const apiKey = serverEnv.t3nAgentApiKey;
  const did = serverEnv.t3nAgentDid;
  const baseUrl = serverEnv.t3nBaseUrl || "https://testnet.terminal3.io";

  if (!apiKey || !did) {
    return null;
  }

  return { apiKey, agentDid: did, baseUrl };
}

export function isT3nConfigured(): boolean {
  return !!getT3nCredentials();
}

export async function connectT3n(): Promise<T3nStatus> {
  const creds = getT3nCredentials();
  if (!creds) {
    return {
      connected: false,
      configured: false,
      sessionId: null,
      agentDid: null,
      environment: null,
      lastVerified: null,
    };
  }

  try {
    if (!wasmComponent) {
      wasmComponent = await loadWasmComponent();
    }

    if (!client) {
      setEnvironment("testnet");
      const handlers = createDefaultHandlers(creds.baseUrl);

      client = new T3nClient({
        wasmComponent,
        baseUrl: creds.baseUrl,
        handlers,
        headers: {
          "x-api-key": creds.apiKey,
        },
      });
    }

    if (!sessionId) {
      const handshakeResult = await client.handshake();
      sessionId = handshakeResult.sessionId.value;

      agentDid = creds.agentDid;
    }

    connectionAttempted = true;

    return {
      connected: true,
      configured: true,
      sessionId,
      agentDid,
      environment: "testnet",
      lastVerified: new Date().toISOString(),
    };
  } catch (error) {
    console.error("T3N connection failed:", error);
    return {
      connected: false,
      configured: true,
      sessionId: null,
      agentDid: creds.agentDid,
      environment: "testnet",
      lastVerified: null,
    };
  }
}

export async function getT3nStatus(): Promise<T3nStatus> {
  if (!isT3nConfigured()) {
    return {
      connected: false,
      configured: false,
      sessionId: null,
      agentDid: null,
      environment: null,
      lastVerified: null,
    };
  }

  if (!connectionAttempted) {
    return connectT3n();
  }

  return {
    connected: !!sessionId,
    configured: true,
    sessionId,
    agentDid,
    environment: "testnet",
    lastVerified: sessionId ? new Date().toISOString() : null,
  };
}

export async function disconnectT3n(): Promise<void> {
  client = null;
  wasmComponent = null;
  sessionId = null;
  agentDid = null;
  connectionAttempted = false;
}
