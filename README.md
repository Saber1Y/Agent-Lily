# Agent Lily

Agent Lily is a cross-chain yield strategist that monitors USDC lending yields across chains and uses LI.FI to route capital toward better opportunities.

## The Problem

- Different DeFi chains offer different yields on the same asset (USDC)
- Ethereum might offer 3.5%, while Base offers 4.5%
- Manually tracking and moving funds is tedious

## The Solution

This AI agent:
1. Fetches live USDC supply APR across supported chains
2. Compares yields and finds the best opportunity
3. Uses LI.FI SDK to get cross-chain bridge quotes
4. Recommends (and can execute) rebalancing to maximize yield

## Tech Stack

- **Next.js 16** - React framework
- **LI.FI SDK** - Cross-chain swaps and bridging
- **Aave + on-chain reads** - Real-time yield data
- **Viem** - Ethereum interaction
- **Tailwind CSS** - Styling

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the agent.

## Agent Lily CLI

The repo includes a non-wallet operator CLI for read, reporting, and admin tasks.

### Install / run locally

```bash
npm run cli -- help
```

By default, the CLI uses:

- base URL: `http://127.0.0.1:3000`
- config file: `~/.lily/config.json`

### Authenticate from the dashboard

The intended flow is:

1. Open `/dashboard/policies`
2. Enter your admin token
3. Click `Generate CLI Token`
4. Copy the generated command:

```bash
lily auth token <TOKEN>
```

This stores a dedicated Lily CLI token locally. It is separate from the raw admin secret.

### Auth commands

```bash
npm run cli -- auth status
npm run cli -- auth token <TOKEN>
npm run cli -- auth logout
```

### Common commands

```bash
npm run cli -- status
npm run cli -- yields
npm run cli -- report
npm run cli -- runs --limit 5
npm run cli -- config get
npm run cli -- run
```

### Config updates

```bash
npm run cli -- config set \
  --current-chain-id 42161 \
  --position-usdc 250 \
  --min-net-gain-usd 15 \
  --max-route-cost-usd 8 \
  --telegram-enabled true
```

### Use with a deployed app

If you want the CLI to target a deployed Lily instance, save the token with the deployed base URL:

```bash
npm run cli -- auth token <TOKEN> --base-url https://your-app.vercel.app
```

You can still override at runtime with env vars:

```bash
LILY_BASE_URL=https://your-app.vercel.app \
LILY_AGENT_TOKEN=<TOKEN> \
npm run cli -- status
```

## Project Structure

```
src/
├── lib/
│   ├── agent.ts      # Main agent logic
│   ├── yields.ts     # Yield aggregation
│   └── lifi.ts       # LI.FI SDK integration
└── app/
    └── page.tsx      # Demo UI
```

## How It Works

### 1. Dynamic Chain Discovery (LI.FI SDK)
```typescript
// Dynamically fetches all supported chains from LI.FI
const chains = await fetchSupportedChains();
// Returns: [{ id: 1, name: 'Ethereum' }, { id: 42161, name: 'Arbitrum' }, ...]
```

### 2. Yield Fetching
```typescript
// Fetches live USDC yields
const yields = await fetchYields();
// Returns: { 42161: { chainName: 'Arbitrum', supplyApr: 4.2%, ... } }
```

### 3. Decision Making
```typescript
// Finds best yield opportunity
const decision = findBestYield(yields, currentChainId);
// Returns: { shouldRebalance: true, fromChain: 42161, toChain: 8453, ... }
```

### 4. Cross-Chain Bridge
```typescript
// Gets LI.FI quote for bridging
const quote = await getBridgeQuote({
  fromChainId: 42161,  // Arbitrum
  toChainId: 8453,    // Base
  fromAmount: '1000000', // 1 USDC
  fromAddress: '0x...',
});
```

## Supported Chains

| Chain | Chain ID | Typical USDC Yield |
|-------|----------|-------------------|
| Arbitrum | 42161 | ~4.0% |
| Base | 8453 | ~4.5% |
| Optimism | 10 | ~4.0% |
| Ethereum | 1 | ~3.5% |
| Polygon | 137 | ~3.8% |

## LI.FI Integration Methods (Required by Hackathon)

This project uses LI.FI in production code and includes optional LI.FI tooling for the development workflow:

### 1. LI.FI SDK ✅ (Primary)
Used in `src/lib/lifi.ts` for cross-chain bridging:
```typescript
import { getQuote, createConfig, executeRoute } from '@lifi/sdk';
```

### 2. LI.FI MCP Server ✅
Configured for AI coding assistants in `mcp.json`:
```json
{
  "mcpServers": {
    "lifi": {
      "type": "http",
      "url": "https://mcp.li.quest/mcp"
    }
  }
}
```

To use: Add this config to your AI assistant's MCP settings.

### 3. LI.FI Agent Skills ✅
Can be installed into Claude, Cursor, Codex, or other AI assistants:
```bash
npx skills add https://github.com/lifinance/lifi-agent-skills --skill li-fi-sdk
```

This gives the AI assistant knowledge about LI.FI SDK functions.

### 4. OpenClaw Plugin
Not used in this build.

## Demo Flow

1. **Select Chain** - Choose your current chain (e.g., Arbitrum)
2. **Run Analysis** - Click button to fetch yields
3. **View Decision** - See yield comparison and recommendation
4. **Bridge** - Use LI.FI to execute the cross-chain transfer

## Testing with Real Funds

LI.FI doesn't support testnets (bridges have no liquidity). For testing:

1. Use **small amounts** (~$1-5)
2. Use **low-gas chains** (Arbitrum, Base, Optimism)
3. Or just demo the **quote/decision flow** without executing



## License

MIT
