export interface T3nSecrets {
  agentApiKey: string;
  agentDid: string;
  operatorAddress: string;
  baseUrl: string;
}

export interface BridgeAuthorization {
  version: string;
  agentDid: string;
  operatorAddress: string;
  issuedAt: number;
  expiresAt: number;
  maxAmountPerBridge: string;
  allowedSourceChains: number[];
  allowedDestinationChains: number[];
  nonce: string;
}

export interface SignedBridgeAuthorization {
  authorization: BridgeAuthorization;
  signatureHex: string;
  signerAddress: string;
}

export interface T3nStatus {
  connected: boolean;
  configured: boolean;
  sessionId: string | null;
  agentDid: string | null;
  environment: string | null;
  lastVerified: string | null;
}

export interface AuthCheckResult {
  authorized: boolean;
  reason: string;
  operatorAddress: string | null;
  signedByExpectedOperator: boolean;
  isExpired: boolean;
  amountWithinLimit: boolean;
  chainsAllowed: boolean;
  expiresAt: number | null;
}
