"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { DashboardShell } from "@/components/DashboardShell";
import { ActionButton, StatusPill } from "@/components/dashboard/ui";
import { WalletAddressSync } from "@/components/WalletAddressSync";
import { clientEnv } from "@/env/client";
import { getChatResponse } from "@/lib/chat";
import {
  deleteChat,
  generateChatTitle,
  getStoredChats,
  saveChat,
  type ChatMessage,
} from "@/lib/chatStorage";
import {
  canExecuteWithWallet,
  executeFromInput,
  type ExecutableWallet,
} from "@/lib/execution";

type Message = ChatMessage;

interface ChatHistory {
  id: string;
  title: string;
  timestamp: number;
}

interface SlashCommand {
  command: string;
  description: string;
  template: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/help", description: "Show available commands", template: "help" },
  { command: "/yields", description: "Check live Aave USDC yields", template: "check yields" },
  { command: "/chains", description: "List supported LI.FI chains", template: "supported chains" },
  { command: "/rebalance", description: "Analyze a rebalance opportunity", template: "rebalance 100 from arbitrum" },
  { command: "/bridge", description: "Get a bridge quote", template: "bridge 100 usdc from arbitrum to base" },
  { command: "/execute-bridge", description: "Execute a bridge with connected wallet", template: "execute bridge 1 usdc from arbitrum to base" },
  { command: "/execute-rebalance", description: "Execute the suggested rebalance", template: "execute rebalance 1 from arbitrum" },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "initial",
    role: "assistant",
    content: `Hello! I'm Agent Lily, your LI.FI-powered yield strategist.

I can help you:
• Check live Aave USDC yields across chains
• Compare cross-chain opportunities
• Get LI.FI bridge quotes
• Recommend rebalancing opportunities

What would you like to do?`,
    timestamp: Date.now(),
  },
];

function createTimestamp() {
  return Date.now();
}

function DashboardChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Thinking...");
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [walletChainId, setWalletChainId] = useState<number | undefined>();
  const [wallet, setWallet] = useState<ExecutableWallet | null>(null);
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const dynamicEnvironmentId = clientEnv.dynamicEnvironmentId;
  const prefilledCommand = searchParams.get("command") ?? "";
  const currentInput = input || prefilledCommand;
  const isSlashMode = currentInput.trimStart().startsWith("/");
  const slashMatches = SLASH_COMMANDS.filter((item) =>
    item.command.startsWith(currentInput.trim().toLowerCase() || "/"),
  );
  const canExecute = canExecuteWithWallet(wallet);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    let cancelled = false;
    void getStoredChats(walletAddress)
      .then((storedChats) => {
        if (cancelled) {
          return;
        }

        setChats(
          storedChats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            timestamp: chat.timestamp,
          })),
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        toast.error("Failed to load chats.", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setActiveChatId(null);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    if (!walletAddress) {
      return;
    }

    void getStoredChats(walletAddress).then((stored) => {
      const chat = stored.find((c) => c.id === chatId);
      if (chat) {
        setMessages(chat.messages);
        setActiveChatId(chatId);
      }
    });
  }, [walletAddress]);

  const handleWalletChange = useCallback((params: { address?: string; wallet: unknown; chainId?: number }) => {
    const { address, wallet, chainId } = params as { address?: string; wallet: { address: string; connector: unknown } | null; chainId?: number };
    setWalletAddress(address);
    setWalletChainId(chainId);
    if (!wallet) {
      setChats([]);
      setMessages(INITIAL_MESSAGES);
      setActiveChatId(null);
      setWallet(null);
      return;
    }
    setWallet({
      address: wallet.address,
      connector: wallet.connector,
    });
  }, []);

  const handleDeleteChat = useCallback((chatId: string) => {
    if (!walletAddress) {
      return;
    }

    void deleteChat(walletAddress, chatId)
      .then(async () => {
        const storedChats = await getStoredChats(walletAddress);
        setChats(storedChats.map((c) => ({ id: c.id, title: c.title, timestamp: c.timestamp })));
      })
      .catch((error) => {
        toast.error("Failed to delete chat.", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred.",
        });
      });
    if (activeChatId === chatId) {
      setMessages(INITIAL_MESSAGES);
      setActiveChatId(null);
    }
  }, [activeChatId, walletAddress]);

  const sendCommand = async (commandValue: string, displayValue: string) => {
    if (!commandValue.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: displayValue,
      timestamp: createTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setLoadingLabel(
      isExecuteCommand(commandValue)
        ? "Waiting for wallet approval..."
        : "Thinking...",
    );

    let response = "";
    let actionCommand: string | undefined;
    try {
      if (isExecuteCommand(commandValue)) {
        response = await executeFromInput(commandValue, wallet);
        toast.success("Execution submitted.", {
          description: "Approve in wallet and track the result in this chat.",
        });
      } else {
        const recentHistory = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
        response = await getChatResponse(commandValue, { walletAddress, walletChainId, history: recentHistory });
        actionCommand = getActionCommand(commandValue, response);
      }
    } catch (error) {
      response = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      toast.error("Request failed.", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
      timestamp: createTimestamp(),
      actionCommand,
    };

    const allMessages: Message[] = [...messages, userMessage, assistantMessage];
    setMessages(allMessages);
    setIsLoading(false);
    setLoadingLabel("Thinking...");

    const firstUserMsg = messages.find((m) => m.role === "user")?.content || "";
    const title = activeChatId
      ? chats.find((c) => c.id === activeChatId)?.title || "New Chat"
      : generateChatTitle(firstUserMsg || displayValue);
    const chatId = activeChatId || crypto.randomUUID();
    if (walletAddress) {
      try {
        await saveChat(walletAddress, {
          id: chatId,
          title,
          messages: allMessages,
          timestamp: assistantMessage.timestamp,
        });
        const storedChats = await getStoredChats(walletAddress);
        setChats(
          storedChats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            timestamp: chat.timestamp,
          })),
        );
      } catch (error) {
        toast.error("Failed to save chat.", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred.",
        });
      }
    }
    setActiveChatId(chatId);
  };

  return (
    <DashboardShell
      currentPage="chat"
      title="Agent Lily Chat"
      subtitle="Conversational workspace for quotes, analysis, and execution."
      chats={chats}
      activeChat={activeChatId}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onDeleteChat={handleDeleteChat}
      showChatHistory={true}
    >
      {dynamicEnvironmentId ? (
        <WalletAddressSync
          onChange={handleWalletChange}
        />
      ) : null}

      <div className="flex min-h-[72vh] flex-col rounded-[30px] border border-[#262633] bg-[linear-gradient(180deg,rgba(20,20,28,0.96),rgba(13,13,18,0.96))] shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between border-b border-[#232330] px-6 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#72738A]">
              Conversation Mode
            </div>
            <div className="mt-1 text-sm text-[#A0A0B0]">
              Ask Lily for analysis, quotes, and execution previews.
            </div>
          </div>
          <StatusPill tone="accent">Live Chat</StatusPill>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-[24px] px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] ${
                    message.role === "user"
                      ? "bg-[#fab6f5] text-black"
                      : "border border-[#2A2A35] bg-[#15151E] text-[#E0E0E0]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fab6f5]">
                        <span className="text-xs font-bold text-black">LY</span>
                      </div>
                      <span className="text-xs font-medium text-[#A0A0B0]">
                        Agent Lily
                      </span>
                    </div>
                  ) : null}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.role === "assistant" && message.actionCommand ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          sendCommand(
                            message.actionCommand!,
                            message.actionCommand!.replace(/^execute\s+/i, "/execute "),
                          )
                        }
                        disabled={isLoading || !canExecute}
                        className="rounded-xl bg-[#fab6f5] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        {canExecute
                          ? "Execute"
                          : walletAddress
                            ? "Unsupported Wallet"
                            : "Connect Wallet to Execute"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInput(message.actionCommand!)}
                        disabled={isLoading}
                        className="rounded-xl border border-[#3A3A48] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Edit Command
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-[24px] border border-[#2A2A35] bg-[#15151E] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fab6f5]">
                      <span className="text-xs font-bold text-black">LY</span>
                    </div>
                    <span className="text-xs text-[#A0A0B0]">{loadingLabel}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-[#232330] px-6 py-4">
          <div className="relative">
            {isSlashMode ? (
              <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-[24px] border border-[#2A2A35] bg-[#12121A] shadow-2xl">
                {slashMatches.length ? (
                  <div className="max-h-64 overflow-y-auto py-2">
                    {slashMatches.map((item) => (
                      <button
                        key={item.command}
                        type="button"
                        onClick={() => setInput(item.template)}
                        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-[#1A1A24]"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {item.command}
                          </div>
                          <div className="text-xs text-[#A0A0B0]">
                            {item.description}
                          </div>
                        </div>
                        <div className="max-w-56 truncate text-xs text-[#606070]">
                          {item.template}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-[#A0A0B0]">
                    No slash commands matched.
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-3 rounded-[24px] border border-[#2A2A35] bg-[#15151E] px-4 py-3">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const resolvedInput = resolveSlashCommand(currentInput);
                    void sendCommand(
                      resolvedInput.commandValue,
                      resolvedInput.displayValue,
                    );
                  }
                }}
                placeholder={walletAddress ? "Ask Lily or type / for commands" : "Connect wallet to start chatting"}
                className="flex-1 bg-transparent text-white placeholder-[#606070] outline-none"
                disabled={isLoading}
              />
              <ActionButton
                onClick={() => {
                  const resolvedInput = resolveSlashCommand(currentInput);
                  void sendCommand(
                    resolvedInput.commandValue,
                    resolvedInput.displayValue,
                  );
                }}
                disabled={!currentInput.trim() || isLoading || !walletAddress}
              >
                Send
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function DashboardChatPage() {
  return (
    <Suspense fallback={<div className="min-h-[72vh] rounded-[30px] border border-[#262633] bg-[#15151E]" />}>
      <DashboardChatContent />
    </Suspense>
  );
}

function resolveSlashCommand(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return { commandValue: input, displayValue: input };
  }

  const [command, ...rest] = trimmed.split(/\s+/);
  const args = rest.join(" ").trim();

  switch (command.toLowerCase()) {
    case "/help":
      return { commandValue: "help", displayValue: "/help" };
    case "/yields":
      return { commandValue: "check yields", displayValue: args ? `/yields ${args}` : "/yields" };
    case "/chains":
      return { commandValue: "supported chains", displayValue: args ? `/chains ${args}` : "/chains" };
    case "/rebalance":
      return { commandValue: args || "rebalance 100 from arbitrum", displayValue: args ? `/rebalance ${args}` : "/rebalance" };
    case "/bridge":
      return { commandValue: args || "bridge 100 usdc from arbitrum to base", displayValue: args ? `/bridge ${args}` : "/bridge" };
    case "/execute-bridge":
      return { commandValue: args || "execute bridge 1 usdc from arbitrum to base", displayValue: args ? `/execute-bridge ${args}` : "/execute-bridge" };
    case "/execute-rebalance":
      return { commandValue: args || "execute rebalance 1 from arbitrum", displayValue: args ? `/execute-rebalance ${args}` : "/execute-rebalance" };
    default:
      return { commandValue: input, displayValue: input };
  }
}

function getActionCommand(commandValue: string, response: string) {
  const normalized = commandValue.toLowerCase();

  if (normalized.includes("bridge") && !normalized.includes("execute")) {
    return `execute ${commandValue}`;
  }

  if (
    normalized.includes("rebalance") &&
    !normalized.includes("execute") &&
    !response.toLowerCase().includes("action: hold current position")
  ) {
    return `execute ${commandValue}`;
  }

  return undefined;
}

function isExecuteCommand(commandValue: string) {
  return /^execute\b/i.test(commandValue.trim());
}
