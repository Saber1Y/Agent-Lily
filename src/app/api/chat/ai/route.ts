import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { serverEnv } from "@/env/server";

const SYSTEM_PROMPT = `You are Agent Lily, a cross-chain USDC yield strategist. You help users optimize their USDC positions across chains.

When a tool result is provided below, use it to answer the user's question in a natural, conversational way. Don't just dump the raw data — format it nicely in plain text.

Keep responses concise and helpful. If the user asks a question outside your scope, politely redirect them to the available commands.`;

const API_KEY = serverEnv.geminiApiKey;

let client: GoogleGenAI | null = null;
if (API_KEY) {
  client = new GoogleGenAI({ apiKey: API_KEY });
}

interface AiChatRequest {
  message: string;
  context?: string | null;
  history?: { role: string; content: string }[];
}

export async function POST(request: NextRequest) {
  if (!client) {
    return NextResponse.json(
      { status: "error", message: "Gemini API key not configured." },
      { status: 503 },
    );
  }

  let body: AiChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { message, context, history } = body;
  if (!message?.trim()) {
    return NextResponse.json(
      { status: "error", message: "Message is required." },
      { status: 400 },
    );
  }

  const userPrompt = context
    ? `The user asked: "${message}"\n\nHere is the relevant data from the system:\n${context}\n\nRespond to the user in a natural, conversational way using this data.`
    : message;

  const conversationHistory = (history || []).map((msg) => ({
    role: msg.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: msg.content }],
  }));

  try {
    const result = await client.models.generateContent({
      model: serverEnv.geminiModel || "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I'm Agent Lily. How can I help?" }] },
        ...conversationHistory,
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      config: {
        temperature: 0.7,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });

    const text = result?.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return NextResponse.json({
      status: "success",
      response: text,
    });
  } catch (error) {
    console.error("Gemini chat error", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Gemini request failed.",
      },
      { status: 500 },
    );
  }
}
