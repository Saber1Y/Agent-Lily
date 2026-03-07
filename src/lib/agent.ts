import { fetchYields, findBestYield, ChainYieldMap } from './yields';
import {
  getBridgeQuote,
  getChainName,
  type BridgeQuote,
} from './lifi';

export interface AgentPolicy {
  minYieldDeltaPct?: number | null;
  minNetGainUsd?: number | null;
  maxRouteCostUsd?: number | null;
  allowedDestinationChainIds?: number[] | null;
  blockedChainIds?: number[] | null;
}

export interface AgentDecision {
  timestamp: number;
  currentChain: number;
  yields: ChainYieldMap;
  analysis?: {
    amountUsd?: number;
    routeCostUsd?: number;
    projectedAnnualGainUsd?: number;
    projectedNetAnnualGainUsd?: number;
    paybackDays?: number | null;
    currentYield?: number;
    targetYield?: number;
    blockedReason?: string;
  };
  recommendation: {
    action: 'HOLD' | 'REBALANCE';
    fromChain?: number;
    toChain?: number;
    fromYield?: number;
    toYield?: number;
    yieldDifference?: number;
    quote?: BridgeQuote;
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

  setWalletAddress(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async analyze(
    fromAmount: string = '100000000',
    policy: AgentPolicy = {},
  ): Promise<AgentDecision> {
    const decision: AgentDecision = {
      timestamp: Date.now(),
      currentChain: this.currentChain,
      yields: {},
      analysis: {},
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

      const bestYield = findBestYield(
        yields,
        this.currentChain,
        policy.minYieldDeltaPct ?? 0.2,
      );

      if (bestYield && bestYield.shouldRebalance) {
        const fromChainName = await getChainName(bestYield.fromChain);
        const toChainName = await getChainName(bestYield.toChain);
        decision.message = `${fromChainName}: ${bestYield.fromYield.toFixed(2)}% → ${toChainName}: ${bestYield.toYield.toFixed(2)}% (${bestYield.difference.toFixed(2)}% higher)`;
        decision.analysis = {
          ...decision.analysis,
          currentYield: bestYield.fromYield,
          targetYield: bestYield.toYield,
        };

        if (policy.blockedChainIds?.includes(bestYield.toChain)) {
          decision.message = `${toChainName} has the highest yield, but it is blocked by policy.`;
          decision.analysis = {
            ...decision.analysis,
            blockedReason: `Destination chain ${toChainName} is blocked by policy.`,
          };
          decision.status = 'idle';
          this.onDecision?.(decision);
          return decision;
        }

        if (
          policy.allowedDestinationChainIds?.length &&
          !policy.allowedDestinationChainIds.includes(bestYield.toChain)
        ) {
          decision.message = `${toChainName} has the highest yield, but it is outside your allowed destination list.`;
          decision.analysis = {
            ...decision.analysis,
            blockedReason: `Destination chain ${toChainName} is not in the allowed list.`,
          };
          decision.status = 'idle';
          this.onDecision?.(decision);
          return decision;
        }
        
        const quote = await getBridgeQuote({
          fromChainId: bestYield.fromChain,
          toChainId: bestYield.toChain,
          fromAmount,
          fromAddress: this.walletAddress,
        });

        const amountUsd = Number(quote.fromAmountUSD || 0);
        const routeCostUsd = Math.max(
          0,
          amountUsd - Number(quote.toAmountUSD || quote.fromAmountUSD || 0),
        );
        const projectedAnnualGainUsd =
          amountUsd > 0 ? amountUsd * (bestYield.difference / 100) : 0;
        const projectedNetAnnualGainUsd = projectedAnnualGainUsd - routeCostUsd;
        const paybackDays =
          projectedAnnualGainUsd > 0
            ? (routeCostUsd / projectedAnnualGainUsd) * 365
            : null;

        decision.analysis = {
          ...decision.analysis,
          amountUsd,
          routeCostUsd,
          projectedAnnualGainUsd,
          projectedNetAnnualGainUsd,
          paybackDays,
        };

        if (policy.maxRouteCostUsd && routeCostUsd > policy.maxRouteCostUsd) {
          decision.message = `${toChainName} yields more, but route cost (~$${routeCostUsd.toFixed(2)}) exceeds your max route cost policy ($${policy.maxRouteCostUsd.toFixed(2)}).`;
          decision.analysis = {
            ...decision.analysis,
            blockedReason: `Route cost exceeds max policy threshold.`,
          };
          decision.status = 'idle';
        } else if (
          policy.minNetGainUsd &&
          projectedNetAnnualGainUsd < policy.minNetGainUsd
        ) {
          decision.message = `${toChainName} yields more, but projected net annual gain (~$${projectedNetAnnualGainUsd.toFixed(2)}) is below your minimum net gain policy ($${policy.minNetGainUsd.toFixed(2)}).`;
          decision.analysis = {
            ...decision.analysis,
            blockedReason: `Projected net annual gain is below minimum policy threshold.`,
          };
          decision.status = 'idle';
        } else if (routeCostUsd > 0 && projectedAnnualGainUsd <= routeCostUsd) {
          decision.message = `${fromChainName} has a higher-yield destination on ${toChainName}, but the route cost (~$${routeCostUsd.toFixed(2)}) outweighs the estimated annual gain (~$${projectedAnnualGainUsd.toFixed(2)}) for this position size.`;
          decision.status = 'idle';
        } else {
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
        }
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
