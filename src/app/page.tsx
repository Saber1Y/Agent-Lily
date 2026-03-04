"use client";

import { useState, useEffect } from "react";
import { YieldAgent, AgentDecision } from "@/lib/agent";

const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0fAb1";

export default function Home() {
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState(42161);

  const agent = new YieldAgent(WALLET_ADDRESS, selectedChain);

  useEffect(() => {
    agent.setOnDecision((d) => {
      setDecision(d);
      setIsLoading(d.status === "analyzing");
    });
  }, []);

  const runAnalysis = async () => {
    setIsLoading(true);
    agent.setCurrentChain(selectedChain);
    await agent.analyze();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            LI.FI Yield Rebalancing Agent
          </h1>
          <p className="text-slate-400">
            Autonomous cross-chain yield optimization powered by AaveScan + LI.FI
          </p>
        </header>

        <div className="grid gap-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
              Agent Configuration
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-sm">Current Chain</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(Number(e.target.value))}
                  className="w-full mt-1 p-3 bg-slate-900 rounded-lg border border-slate-700"
                >
                  <option value={42161}>Arbitrum</option>
                  <option value={8453}>Base</option>
                  <option value={10}>Optimism</option>
                  <option value={1}>Ethereum</option>
                  <option value={137}>Polygon</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm">Wallet Address</label>
                <div className="mt-1 p-3 bg-slate-900 rounded-lg font-mono text-sm truncate">
                  {WALLET_ADDRESS}
                </div>
              </div>
            </div>
            <button
              onClick={runAnalysis}
              disabled={isLoading}
              className="mt-4 w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {isLoading ? "Analyzing Yields..." : "Run Agent Analysis"}
            </button>
          </div>

          {decision && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                Agent Decision
              </h2>
              
              <div className={`p-4 rounded-xl mb-4 ${
                decision.recommendation.action === "REBALANCE" 
                  ? "bg-green-500/20 border border-green-500/50" 
                  : "bg-blue-500/20 border border-blue-500/50"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-2xl ${
                    decision.recommendation.action === "REBALANCE" ? "↔️" : "✅"
                  }`}>
                    {decision.recommendation.action === "REBALANCE" ? "↔️" : "✅"}
                  </span>
                  <span className="text-lg font-semibold">
                    {decision.recommendation.action === "REBALANCE" ? "RECOMMENDATION: REBALANCE" : "HOLD"}
                  </span>
                </div>
                <p className="text-slate-300">{decision.message}</p>
              </div>

              {decision.recommendation.action === "REBALANCE" && decision.recommendation.fromChain && decision.recommendation.toChain && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">From</div>
                    <div className="text-lg font-semibold">
                      {decision.yields[decision.recommendation.fromChain]?.chainName || `Chain ${decision.recommendation.fromChain}`}
                    </div>
                    <div className="text-cyan-400">
                      {decision.recommendation.fromYield?.toFixed(2)}% APY
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm">To</div>
                    <div className="text-lg font-semibold">
                      {decision.yields[decision.recommendation.toChain]?.chainName || `Chain ${decision.recommendation.toChain}`}
                    </div>
                    <div className="text-green-400">
                      {decision.recommendation.toYield?.toFixed(2)}% APY
                    </div>
                  </div>
                </div>
              )}

              {decision.yields && Object.keys(decision.yields).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-slate-400 text-sm mb-2">Yield Comparison</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.values(decision.yields).map((y) => (
                      <div 
                        key={y.chainId} 
                        className={`p-3 rounded-lg text-center ${
                          y.chainId === selectedChain ? "bg-cyan-500/30 border border-cyan-500" : "bg-slate-900/50"
                        }`}
                      >
                        <div className="text-xs text-slate-400">{y.chainName}</div>
                        <div className="font-semibold">{y.supplyApr.toFixed(2)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              How It Works
            </h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex gap-3">
                <span className="text-yellow-400 font-mono">01</span>
                <span>Agent fetches live USDC yields from AaveScan API across multiple chains</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 font-mono">02</span>
                <span>Compares yields and finds the best opportunity</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 font-mono">03</span>
                <span>Uses LI.FI SDK to get cross-chain bridge quotes</span>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 font-mono">04</span>
                <span>Recommends rebalancing to higher yield chain</span>
              </div>
            </div>
          </div>

          <div className="text-center text-slate-500 text-sm">
            Powered by{" "}
            <a href="https://li.fi" className="text-cyan-400 hover:underline">LI.FI</a> +{" "}
            <a href="https://aavescan.com" className="text-purple-400 hover:underline">AaveScan</a>
          </div>
        </div>
      </div>
    </div>
  );
}
