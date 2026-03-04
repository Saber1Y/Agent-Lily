# LI.FI Yield Rebalancing Agent

An autonomous AI agent that monitors USDC lending yields across chains via AaveScan API and automatically uses LI.FI to bridge funds from lower-yield chains to higher-yield chains.

## The Problem

- Different DeFi chains offer different yields on the same asset (USDC)
- Ethereum might offer 3.5%, while Base offers 4.5%
- Manually tracking and moving funds is tedious

## The Solution

This AI agent:
1. Fetches live USDC supply APR from AaveScan API across 7+ chains
2. Compares yields and finds the best opportunity
3. Uses LI.FI SDK to get cross-chain bridge quotes
4. Recommends (and can execute) rebalancing to maximize yield

## Tech Stack

- **Next.js 16** - React framework
- **LI.FI SDK** - Cross-chain swaps and bridging
- **AaveScan API** - Real-time yield data
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

## Project Structure

```
src/
├── lib/
│   ├── agent.ts      # Main agent logic
│   ├── yields.ts     # AaveScan API integration
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
// Fetches live USDC yields from AaveScan
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

This project implements ALL required LI.FI integrations:

### 1. LI.FI SDK ✅ (Primary)
Used in `src/lib/lifi.ts` for cross-chain bridging:
```typescript
import { getQuote, createConfig, executeRoute } from '@lifi/sdk';
```

### 2. LI.FI MCP Server ✅
For AI coding assistants (Claude, Cursor, Windsurf). Already configured in `mcp.json`:
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
Install into Claude, Cursor, Codex, or other AI assistants:
```bash
npx skills add https://github.com/lifinance/lifi-agent-skills --skill li-fi-sdk
```

This gives the AI assistant knowledge about LI.FI SDK functions.

### 4. OpenClaw Plugin ❌ (Not Used)
Skipped - user not using OpenClaw.

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
