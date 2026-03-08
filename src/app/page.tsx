import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CHAINS, FEATURES, STEPS } from "@/constants";
import {
  HiOutlineTrendingUp,
  HiOutlineSwitchHorizontal,
  HiOutlineSparkles,
  HiOutlineRefresh,
} from "react-icons/hi";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 px-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fab6f5]/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute top-0 left-1/4 w-px h-48 bg-gradient-to-b from-[#fab6f5]/35 to-transparent" />
        <div className="pointer-events-none absolute top-0 right-1/4 w-px h-32 bg-gradient-to-b from-[#fab6f5]/20 to-transparent" />

        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <Image
            src="/lily.png"
            alt="Agent Lily"
            fill
            priority
            className="object-cover object-center opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#09090b]/82 via-[#09090b]/38 to-[#09090b]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/30 to-[#09090b]/62" />
          <div className="absolute inset-0 bg-[#09090b]/18" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#09090b]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#09090b] to-transparent" />

        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <Image
            src="/lily.png"
            alt="Agent Lily"
            fill
            priority
            className="object-cover object-center opacity-16"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#09090b]/36 to-[#09090b]/88" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A24] border border-[#2A2A35] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#fab6f5] animate-pulse"></span>
            <span className="text-sm text-[#A0A0B0]">Agent Lily • Powered by LI.FI SDK</span>
          </div>

          {/* <div className="mx-auto mb-8 flex w-fit items-center gap-4 rounded-3xl border border-[#2A2A35] bg-[#111119]/80 px-5 py-4 backdrop-blur">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[#2A2A35]">
              <Image
                src="/lily.png"
                alt="Agent Lily portrait"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Agent Lily</div>
              <div className="text-xs text-[#A0A0B0]">
                Autonomous cross-chain yield strategist
              </div>
            </div>
          </div> */}

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">Meet Agent Lily</span>
            <br />
            <span className="text-white">Your Cross-Chain Yield Strategist</span>
          </h1>

          <p className="text-xl text-[#A0A0B0] max-w-2xl mx-auto mb-10">
            A cross-chain operator console for USDC yield rebalancing. Agent
            Lily monitors live Aave yields, prices LI.FI routes, explains every
            move, and gives you approvals, reports, Telegram alerts, and CLI access.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="glow-blue">
                Open Dashboard →
              </Button>
            </Link>
            <Link href="/dashboard/chat">
              <Button variant="outline" size="lg">
                Talk to Lily
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { label: "Dashboard Modules", value: "6" },
              { label: "Operator Channels", value: "Chat + CLI + Telegram" },
              { label: "Policy Controls", value: "7" },
              { label: "Execution Stack", value: "Aave + LI.FI" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-[#606070]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-[#12121A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-[#A0A0B0]">
              Agent Lily watches the market, explains the route, and keeps operators inside explicit rules
            </p>
          </div>

          <div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            id="#howitworks"
          >
            {FEATURES.map((feature, index) => {
              const IconComponent = {
                HiOutlineTrendingUp: HiOutlineTrendingUp,
                HiOutlineSwitchHorizontal: HiOutlineSwitchHorizontal,
                HiOutlineSparkles: HiOutlineSparkles,
                HiOutlineRefresh: HiOutlineRefresh,
              }[feature.icon];

              return (
                <Card key={index} hover className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F7C2FF]/20 to-[#5C67FF]/20 mb-4">
                    {IconComponent && (
                      <IconComponent className="w-8 h-8 text-[#F7C2FF]" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#A0A0B0]">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Get Started with Lily
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-[#1A1A24] absolute -top-4 -left-2">
                  {step.number}
                </div>
                <div className="pt-8 pl-4">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[#A0A0B0]">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <span className="text-[#5C67FF] text-2xl">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#12121A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              What You Can Do Today
            </h2>
            <p className="text-[#A0A0B0]">
              The product is already structured around real operator workflows, not one demo screen.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Dashboard Overview",
                copy:
                  "See recent runs, projected net gain, pending items, and the latest operator snapshot in one control room.",
              },
              {
                title: "Approval Inbox",
                copy:
                  "Review dry-run opportunities and jump straight into chat to act on the exact recommendation.",
              },
              {
                title: "Weekly Reports",
                copy:
                  "Show recent automation activity, projected net gain, and the summary judges can understand quickly.",
              },
              {
                title: "Policy Engine",
                copy:
                  "Set minimum net gain, route cost, cooldowns, chain allowlists, and autonomous execution rules.",
              },
              {
                title: "CLI + Telegram",
                copy:
                  "Generate Lily CLI tokens from the dashboard and deploy outbound Telegram alerts from the same backend.",
              },
            ].map((item) => (
              <Card key={item.title} hover>
                <h3 className="text-lg font-semibold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-[#A0A0B0]">
                  {item.copy}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Full Workspace Map
            </h2>
            <p className="text-[#A0A0B0]">
              Agent Lily is not just one chat screen. The product already ships as a modular operator workspace.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "/dashboard",
                label: "Overview",
                copy:
                  "Top-level control room with run metrics, projected net performance, and module entry points.",
              },
              {
                title: "/dashboard/approvals",
                label: "Approvals",
                copy:
                  "Dry-run recommendations that can be reviewed and handed off into chat for action.",
              },
              {
                title: "/dashboard/chat",
                label: "Chat",
                copy:
                  "Conversational workspace for live yield checks, bridge quotes, rebalance analysis, and wallet execution.",
              },
              {
                title: "/dashboard/reports",
                label: "Reports",
                copy:
                  "Stored run history, operator summaries, and judge-friendly weekly reporting context.",
              },
              {
                title: "/dashboard/policies",
                label: "Policies + CLI",
                copy:
                  "Admin workspace for chain filters, route-cost rules, cooldowns, auto-execution settings, and CLI token generation.",
              },
              {
                title: "/dashboard/telegram",
                label: "Telegram",
                copy:
                  "Admin workspace for deploying Lily as an outbound Telegram bot with encrypted bot credentials.",
              },
            ].map((item) => (
              <Card key={item.title} hover>
                <div className="text-xs uppercase tracking-[0.24em] text-[#72738A] mb-3">
                  {item.label}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-[#A0A0B0]">
                  {item.copy}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Chains */}
      <section className="py-20 px-6 bg-[#12121A]" id="supportedchains">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Supported Chains
            </h2>
            <p className="text-[#A0A0B0]">
              Lily tracks yield opportunities across the multi-chain stack
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {CHAINS.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center gap-3 px-5 py-3 rounded-full bg-[#1A1A24] border border-[#2A2A35] hover:border-[#3A3A48] transition-all"
              >
                <Image
                  src={chain.logo}
                  alt={chain.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white font-medium">{chain.name}</span>
                <span className="text-[#606070] text-sm">({chain.symbol})</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-[#A0A0B0] text-sm">
              Bridging powered by{" "}
              <a
                href="https://li.fi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5C67FF] hover:underline"
              >
                LI.FI
              </a>{" "}
              • Yield data from{" "}
              <a
                href="https://aave.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F7C2FF] hover:underline"
              >
                Aave
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#1A1A24] to-[#12121A] rounded-3xl p-12 border border-[#2A2A35]">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Deploy Agent Lily?
            </h2>
            <p className="text-[#A0A0B0] mb-8">
              Launch Lily and let her explain, simulate, and execute your next cross-chain move.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="glow-pink">
                Launch Lily Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#2A2A35]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#606070] text-sm">Agent Lily</span>
          </div>
          <div className="text-[#606070] text-sm">
            Built for LI.FI Vibeathon 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
