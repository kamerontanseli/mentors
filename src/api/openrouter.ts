import type { ChatParams, StreamResponse, ApiError } from "../types/api";
import type { AvailableModel } from "../types/chat";
import apiData from "../api.json";

export async function streamChatCompletion(params: ChatParams, apiKey: string): Promise<ReadableStream> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Coaches App",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok || !response.body) {
    const errorData: ApiError = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return response.body;
}

export function parseStreamChunk(chunk: string): string | null {
  const lines = chunk.split("\n").filter((l) => l.trim());
  let content = "";
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      
      try {
        const parsed: StreamResponse = JSON.parse(data);
        const deltaContent = parsed.choices?.[0]?.delta?.content || "";
        content += deltaContent;
      } catch (err) {
        console.error("Error parsing stream chunk:", err);
      }
    }
  }
  
  return content || null;
}

export function getAvailableModels(): AvailableModel[] {
  const models: AvailableModel[] = [];
  
  const openrouterModels = apiData.openrouter.models as Record<string, {
    id: string;
    name: string;
    reasoning?: boolean;
    nativeReasoning?: boolean;
  }>;
  for (const providerKey in openrouterModels) {
    const model = openrouterModels[providerKey];
    models.push({
      id: model.id,
      name: model.name,
      category: apiData.openrouter.name || "OpenRouter",
      supportsReasoning: !!model.reasoning || false,
      nativeReasoning: !!model.nativeReasoning || false,
    });
  }
  
  return models;
}

export async function generateCoachPrompt(coachName: string, emoji: string, apiKey: string): Promise<string> {
  const prompt = `Create a concise system prompt for an AI coach.
Name: ${coachName || "New Coach"}
Emoji: ${emoji || "🎯"}
Style: Professional, helpful, and specific.
Output only the prompt, no preface.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Coaches App",
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You write high quality system prompts for specialized AI coaching assistants.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}