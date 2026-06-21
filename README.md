# Agent Lily

<p align="center">
  <img src="/public/lily.png" alt="Agent Lily" width="220" />
</p>

<p align="center">
  Cross-chain yield agent for USDC allocation, routing, automation, T3N-scoped authorization, and user-scoped operator workflows.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="LI.FI" src="https://img.shields.io/badge/LI.FI-SDK-121212" />
  <img alt="Aave" src="https://img.shields.io/badge/Aave-V3-B6509E" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Storage-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="Dynamic" src="https://img.shields.io/badge/Dynamic-Wallets-5B5BD6" />
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-Reasoning-4285F4?logo=google" />
  <img alt="T3N" src="https://img.shields.io/badge/T3N-Agent%20Auth-1A1A24" />
</p>

## Overview

Agent Lily monitors lending yield opportunities across chains, compares routes, explains decisions, and helps users rebalance USDC into stronger yield positions.

The app combines:

- A public landing page
- A wallet-gated dashboard
- Chat-driven yield analysis and route execution
- Policy controls for automation behavior
- T3N-scoped bridge authorization for trusted agent execution
- Telegram delivery for run notifications
- Wallet-scoped persistence for config, runs, reports, and chats

## What Lily Does

1. Fetches live USDC yield data from supported markets
2. Compares current position yield against better destinations
3. Prices a bridge route through LI.FI
4. Estimates route cost, projected net gain, and payback window
5. Checks T3N bridge authorization before autonomous execution
6. Stores results per connected wallet
7. Surfaces dry-runs, reports, chat history, and optional Telegram alerts

## Core Features

### Dashboard

- Wallet-gated user workspace
- Overview, approvals, reports, chat, policies, and Telegram setup
- User-scoped data tied to the connected wallet address

### Chat Workspace

- Commands for yields, chains, routes, and rebalance analysis
- Wallet-aware route previews
- Bridge and rebalance execution flows from the connected wallet

### Automation

- Dry-run recommendations
- Optional autonomous execution
- Cooldown, route-cost, net-gain, and chain policy controls
- T3N authorization gate for bridge amount, source chains, destination chains, and expiry

### Persistence

- Supabase-backed config storage
- Run history and reporting
- Wallet-scoped chat history
- Encrypted Telegram credentials at rest
- Stored T3N bridge authorization per operator wallet

### T3N Agent Authorization

- Integrates Terminal 3's Agent Developer Kit concepts for trusted agent actions
- Uses a T3N agent DID plus signed bridge authorization to scope autonomous rebalances
- Verifies the operator signature before execution
- Blocks execution when the authorization is missing, expired, over the max USDC amount, or outside allowed source/destination chains
- Exposes dashboard and API flows for issuing, signing, saving, and checking bridge authorization

### Telegram

- Outbound Lily notifications for `dry_run`, `executed`, and `error` events
- Manual and cron-triggered automation updates

## Tech Stack

- Next.js 16
- React 19
- LI.FI SDK
- Aave V3
- Kamino
- Dynamic
- Viem
- Supabase
- Gemini
- Terminal 3 T3N Agent Developer Kit

## CLI

Agent Lily also ships as an npm CLI package:

- npm package: https://www.npmjs.com/package/agent-lily
- CLI README: https://www.npmjs.com/package/agent-lily?activeTab=readme

Install globally:

```bash
npm install -g agent-lily
```

## Quick Start

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`.

## Environment

Use `.env.local` for local development.

Public browser-safe values:

- `NEXT_PUBLIC_DYNAMIC_ENV_ID`
- `NEXT_PUBLIC_LIFI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

Server-only values:

- `AGENT_API_SECRET`
- `CRON_SECRET`
- `AGENT_CONFIG_CIPHER_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `T3N_AGENT_API_KEY`
- `T3N_AGENT_DID`
- `T3N_BASE_URL`
- `T3N_BRIDGE_AUTH`

An example template is included in [.env.example](./.env.example).

## T3N Integration

When T3N is configured, Agent Lily uses it as the trust and authorization layer around autonomous bridge execution. Terminal 3's Agent Developer Kit is built for agents that need verifiable identity, programmable authorization, confidential outbound actions, and auditability. Learn more here: https://www.terminal3.io/products/agent-developer-kit.

In this repo, T3N is used to answer a critical question before Lily moves funds:

> Is this agent currently authorized by the operator to bridge this amount between these chains?

The flow works like this:

1. A T3N agent identity is configured with `T3N_AGENT_API_KEY` and `T3N_AGENT_DID`.
2. An operator signs a bridge authorization that includes:
   - the T3N agent DID
   - the operator wallet address
   - max USDC per bridge
   - allowed source chains
   - allowed destination chains
   - expiry time
   - nonce
3. The signed authorization is saved as `T3N_BRIDGE_AUTH` or stored in the wallet-scoped Supabase config.
4. Before autonomous execution, Lily verifies the signature and checks amount, chain, and expiry constraints.
5. If the authorization check fails, Lily returns a blocked execution result instead of executing the LI.FI route.

Relevant endpoints:

- `POST /api/t3n/authorize` - admin-only helper for issuing a signed bridge authorization
- `POST /api/t3n/authorize/signed` - accepts a wallet-signed bridge authorization and stores it for that operator
- `GET /api/t3n/status` - reports T3N configuration and authorization status

Relevant files:

- `src/lib/t3n/authCore.ts` - bridge authorization creation, parsing, signature recovery, and policy checks
- `src/lib/t3n/authorization.ts` - runtime T3N config and stored authorization helpers
- `src/app/api/t3n/authorize/route.ts` - admin authorization issuing route
- `src/app/api/t3n/authorize/signed/route.ts` - signed operator authorization route
- `src/app/api/t3n/status/route.ts` - T3N status route
- `src/lib/automation.ts` - autonomous rebalance flow that calls the T3N gate before execution

## Demo Commands

In chat:

```text
check yields
rebalance 100
bridge 10 usdc from arbitrum to polygon
check balance on base
t3n status
```

API examples:

```bash
curl -X GET http://localhost:3000/api/agent/yields

curl -X POST http://localhost:3000/api/agent/rebalance \
  -H "x-wallet-address: 0xYourWalletAddress"
```

## Supported Chains

### EVM

| Chain | Chain ID | USDC Address |
|-------|----------|--------------|
| Ethereum | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Arbitrum | 42161 | `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8` |
| Optimism | 10 | `0x7F5c764cBc14f9669B88837ca1490cCa17c31607` |
| Polygon | 137 | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Avalanche | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

### Solana

| Chain | Chain ID | Token |
|-------|----------|-------|
| Solana | `1151111081099710` | `USDC` |

## Project Structure

```text
src/
├── app/
│   ├── dashboard/
│   ├── api/
│   └── page.tsx
├── components/
├── env/
├── lib/
└── constants/
```

Key files:

- `src/lib/agent.ts` - decision engine
- `src/lib/automation.ts` - autonomous rebalance flow
- `src/lib/lifi.ts` - LI.FI route and chain helpers
- `src/lib/yields.ts` - yield aggregation
- `src/lib/persistence.ts` - wallet-scoped storage
- `src/lib/telegram.ts` - Telegram notifications
- `src/lib/t3n/authCore.ts` - T3N bridge authorization checks

## LI.FI Integration

Production integration uses the LI.FI SDK directly.

```ts
import { getQuote, createConfig, executeRoute } from "@lifi/sdk";
```

The repo also includes LI.FI MCP configuration in `mcp.json`.

## License

MIT
