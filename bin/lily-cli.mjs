#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";

const HELP_TEXT = `Agent Lily CLI

Usage:
  lily help
  lily auth status
  lily auth token <TOKEN> [--base-url URL]
  lily auth logout
  lily status [--base-url URL] [--token TOKEN]
  lily yields [--base-url URL] [--token TOKEN]
  lily report [--base-url URL] [--token TOKEN]
  lily runs [--base-url URL] [--token TOKEN] [--limit N]
  lily run [--base-url URL] [--token TOKEN]
  lily config get [--base-url URL] [--token TOKEN]
  lily config set [options] [--base-url URL] [--token TOKEN]

Config set options:
  --current-chain-id N
  --position-usdc AMOUNT
  --auto-rebalance-enabled true|false
  --min-yield-delta-pct N
  --min-net-gain-usd N
  --max-route-cost-usd N
  --cooldown-minutes N
  --allowed-destination-chain-ids 1,10,8453
  --blocked-chain-ids 42161,43114
  --alert-webhook-url URL
  --telegram-bot-token TOKEN
  --telegram-chat-id CHAT_ID
  --telegram-enabled true|false

Environment:
  LILY_BASE_URL   Base URL for deployed app, default http://127.0.0.1:3000
  LILY_AGENT_TOKEN  Lily CLI token or admin token
`;

async function main() {
  const [, , command, subcommand, ...rest] = process.argv;
  const args = parseArgs(rest);
  const storedConfig = readCliConfig();
  const baseUrl = normalizeBaseUrl(
    args["base-url"] ||
      process.env.LILY_BASE_URL ||
      storedConfig.baseUrl ||
      "http://127.0.0.1:3000",
  );
  const token = args.token || process.env.LILY_AGENT_TOKEN || storedConfig.token || "";

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP_TEXT);
    return;
  }

  switch (command) {
    case "auth":
      await handleAuth(subcommand, rest, args, baseUrl);
      return;
    case "status":
      await printStatus(baseUrl, token);
      return;
    case "yields":
      await printYields(baseUrl, token);
      return;
    case "report":
      await printReport(baseUrl, token);
      return;
    case "runs":
      await printRuns(baseUrl, token, Number(args.limit || 10));
      return;
    case "run":
      await triggerRun(baseUrl, token);
      return;
    case "config":
      if (subcommand === "get") {
        await printConfig(baseUrl, token);
        return;
      }
      if (subcommand === "set") {
        await updateConfig(baseUrl, token, args);
        return;
      }
      fail("Unknown config subcommand. Use `config get` or `config set`.");
      return;
    default:
      fail(`Unknown command: ${command}`);
  }
}

async function handleAuth(subcommand, rest, args, baseUrl) {
  switch (subcommand) {
    case "status":
      printAuthStatus(readCliConfig(), baseUrl);
      return;
    case "token": {
      const tokenValue = rest.find((item) => !item.startsWith("--") && item !== "token");
      if (!tokenValue) {
        fail("Usage: lily auth token <TOKEN> [--base-url URL]");
      }
      const resolvedBaseUrl = normalizeBaseUrl(
        args["base-url"] || process.env.LILY_BASE_URL || baseUrl,
      );
      saveCliConfig({
        ...readCliConfig(),
        token: tokenValue,
        baseUrl: resolvedBaseUrl,
      });
      console.log(`Saved Lily CLI token for ${resolvedBaseUrl}`);
      return;
    }
    case "logout":
      clearCliConfig();
      console.log("Cleared Lily CLI credentials");
      return;
    default:
      fail("Unknown auth subcommand. Use `auth status`, `auth token`, or `auth logout`.");
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function authHeaders(token) {
  if (!token) {
    fail("Missing agent token. Set LILY_AGENT_TOKEN or pass --token.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest(baseUrl, token, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(token),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(payload.message || `Request failed with status ${response.status}.`);
  }

  return payload;
}

async function printStatus(baseUrl, token) {
  const [configPayload, reportPayload] = await Promise.all([
    apiRequest(baseUrl, token, "/api/agent/config"),
    apiRequest(baseUrl, token, "/api/agent/report"),
  ]);

  const config = configPayload.config || {};
  const report = reportPayload.report || {};

  console.log("Agent Lily Status");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Current chain: ${config.currentChainId ?? "n/a"}`);
  console.log(`Position USDC: ${config.positionUsdc ?? "n/a"}`);
  console.log(`Auto execution: ${Boolean(config.autoRebalanceEnabled)}`);
  console.log(`Telegram: ${Boolean(config.telegramEnabled) ? "enabled" : "disabled"}`);
  console.log(`Runs: ${report.sampleSize ?? 0}`);
  console.log(`Executed: ${report.executed ?? 0}`);
  console.log(`Projected net annual gain: $${Number(report.projectedNetAnnualGainUsd || 0).toFixed(2)}`);
  console.log(`Latest run: ${report.latestRun?.message || "n/a"}`);
}

async function printYields(baseUrl, token) {
  const payload = await apiRequest(baseUrl, token, "/api/agent/yields");
  const yields = Object.values(payload.yields || {}).sort((left, right) => right.supplyApr - left.supplyApr);

  console.log("Aave USDC Yields");
  for (const item of yields) {
    console.log(`${item.chainName}: ${item.supplyApr.toFixed(2)}% APR | liquidity $${Math.round(item.liquidity).toLocaleString()}`);
  }
}

async function printReport(baseUrl, token) {
  const payload = await apiRequest(baseUrl, token, "/api/agent/report");
  console.log(JSON.stringify(payload.report || {}, null, 2));
}

async function printRuns(baseUrl, token, limit) {
  const payload = await apiRequest(baseUrl, token, "/api/agent/runs");
  const runs = (payload.runs || []).slice(0, Math.max(1, limit));

  for (const run of runs) {
    console.log(`${run.createdAt} | ${run.status} | ${run.triggerSource} | ${run.message}`);
  }
}

async function triggerRun(baseUrl, token) {
  const payload = await apiRequest(baseUrl, token, "/api/agent/rebalance", {
    method: "POST",
  });

  console.log("Manual run complete");
  console.log(JSON.stringify(payload, null, 2));
}

async function printConfig(baseUrl, token) {
  const payload = await apiRequest(baseUrl, token, "/api/agent/config");
  console.log(JSON.stringify(payload.config || {}, null, 2));
}

async function updateConfig(baseUrl, token, args) {
  const payload = {};

  assignIfPresent(payload, "currentChainId", toNumber(args["current-chain-id"]));
  assignIfPresent(payload, "positionUsdc", args["position-usdc"]);
  assignIfPresent(payload, "autoRebalanceEnabled", toBoolean(args["auto-rebalance-enabled"]));
  assignIfPresent(payload, "minYieldDeltaPct", toNullableNumber(args["min-yield-delta-pct"]));
  assignIfPresent(payload, "minNetGainUsd", toNullableNumber(args["min-net-gain-usd"]));
  assignIfPresent(payload, "maxRouteCostUsd", toNullableNumber(args["max-route-cost-usd"]));
  assignIfPresent(payload, "cooldownMinutes", toNullableNumber(args["cooldown-minutes"]));
  assignIfPresent(payload, "allowedDestinationChainIds", toNumberList(args["allowed-destination-chain-ids"]));
  assignIfPresent(payload, "blockedChainIds", toNumberList(args["blocked-chain-ids"]));
  assignIfPresent(payload, "alertWebhookUrl", toNullableString(args["alert-webhook-url"]));
  assignIfPresent(payload, "telegramBotToken", toNullableString(args["telegram-bot-token"]));
  assignIfPresent(payload, "telegramChatId", toNullableString(args["telegram-chat-id"]));
  assignIfPresent(payload, "telegramEnabled", toBoolean(args["telegram-enabled"]));

  const response = await apiRequest(baseUrl, token, "/api/agent/config", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("Config updated");
  console.log(JSON.stringify(response.config || {}, null, 2));
}

function assignIfPresent(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function toNumber(value) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    fail(`Expected numeric value, received: ${value}`);
  }
  return parsed;
}

function toNullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === "null") return null;
  return toNumber(value);
}

function toNullableString(value) {
  if (value === undefined) return undefined;
  if (value === "null") return null;
  return value;
}

function toBoolean(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`Expected boolean true|false, received: ${value}`);
}

function toNumberList(value) {
  if (value === undefined) return undefined;
  if (value === "null" || value === "") return null;
  const list = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  return list;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function getCliConfigPath() {
  return path.join(os.homedir(), ".lily", "config.json");
}

function readCliConfig() {
  try {
    const raw = fs.readFileSync(getCliConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCliConfig(config) {
  const configPath = getCliConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function clearCliConfig() {
  try {
    fs.unlinkSync(getCliConfigPath());
  } catch {}
}

function printAuthStatus(config, baseUrl) {
  console.log("Agent Lily CLI Auth");
  console.log(`Base URL: ${config.baseUrl || baseUrl}`);
  console.log(`Token: ${config.token ? "stored" : "not set"}`);
  console.log(`Config path: ${getCliConfigPath()}`);
}

await main();
