import { fetchYields, findBestYield, ChainYieldMap } from './yields';
import { getBridgeQuote, getSupportedChains, getChainName } from './lifi';

export interface AgentDecision {
  timestamp: number;
  currentChain: number;
  yields: ChainYieldMap;
  recommendation: {
    action: 'HOLD' | 'REBALANCE';
    fromChain?: number;
    toChain?: number;
    fromYield?: number;
    toYield?: number;
    yieldDifference?: number;
    quote?: any;
  };
  status: 'idle' | 'analyzing' | 'ready' | 'executed' | 'error';
  message: string;
}

export class YieldAgent {
  private currentChain: number;
  private walletAddress: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private onDecision: ((decision: AgentDecision) => void) | null = null;

  constructor(walletAddress: string, initialChain: number = 42161) {
    this.walletAddress = walletAddress;
    this.currentChain = initialChain;
  }

  setOnDecision(callback: (decision: AgentDecision) => void) {
    this.onDecision = callback;
  }

  async analyze(): Promise<AgentDecision> {
    const decision: AgentDecision = {
      timestamp: Date.now(),
      currentChain: this.currentChain,
      yields: {},
      recommendation: {
        action: 'HOLD',
      },
      status: 'analyzing',
      message: 'Fetching yield data from Aave...',
    };

    this.onDecision?.(decision);

    try {
      const yields = await fetchYields();
      decision.yields = yields;
      decision.message = `Found yield data for ${Object.keys(yields).length} chains`;

      const bestYield = findBestYield(yields, this.currentChain);

      if (bestYield && bestYield.shouldRebalance) {
        const toChainName = await getChainName(bestYield.toChain);
        decision.message = `Arbitrum: ${bestYield.fromYield.toFixed(2)}% → ${toChainName}: ${bestYield.toYield.toFixed(2)}% (${bestYield.difference.toFixed(2)}% higher)`;
        
        const quote = await getBridgeQuote({
          fromChainId: bestYield.fromChain,
          toChainId: bestYield.toChain,
          fromAmount: '1000000', // 1 USDC
          fromAddress: this.walletAddress,
        });

        decision.recommendation = {
          action: 'REBALANCE',
          fromChain: bestYield.fromChain,
          toChain: bestYield.toChain,
          fromYield: bestYield.fromYield,
          toYield: bestYield.toYield,
          yieldDifference: bestYield.difference,
          quote,
        };
        decision.status = 'ready';
      } else {
        const currentYield = yields[this.currentChain];
        const currentChainName = await getChainName(this.currentChain);
        decision.message = currentYield 
          ? `${currentChainName} has the best yield at ${currentYield.supplyApr.toFixed(2)}%`
          : 'Current chain has best or unknown yield';
        decision.status = 'idle';
      }

      this.onDecision?.(decision);
      return decision;
    } catch (error) {
      decision.status = 'error';
      decision.message = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.onDecision?.(decision);
      return decision;
    }
  }

  startAutoRebalance(intervalMs: number = 60000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.analyze();
    }, intervalMs);

    this.analyze();
  }

  stopAutoRebalance() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  setCurrentChain(chainId: number) {
    this.currentChain = chainId;
  }

  getCurrentChain(): number {
    return this.currentChain;
  }
}
