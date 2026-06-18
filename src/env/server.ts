import "server-only";

export const serverEnv = {
  agentApiSecret: process.env.AGENT_API_SECRET || process.env.CRON_SECRET || "",
  cronSecret: process.env.CRON_SECRET || "",
  agentConfigCipherKey: process.env.AGENT_CONFIG_CIPHER_KEY || "",
  cliTokenTtlDays: process.env.CLI_TOKEN_TTL_DAYS || "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  agentCurrentChainId: process.env.AGENT_CURRENT_CHAIN_ID || "",
  agentPositionUsdc: process.env.AGENT_POSITION_USDC || "",
  autoRebalanceEnabled: process.env.AUTO_REBALANCE_ENABLED || "",
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "",
  geminiSafetyThreshold: process.env.GEMINI_SAFETY_THRESHOLD || "",
  t3nAgentApiKey: process.env.T3N_AGENT_API_KEY || "",
  t3nAgentDid: process.env.T3N_AGENT_DID || "",
  t3nBaseUrl: process.env.T3N_BASE_URL || "",
  t3nBridgeAuth: process.env.T3N_BRIDGE_AUTH || "",
};

export function getNumberEnv(value: string, fallbackValue: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}
