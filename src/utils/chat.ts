import type { MessageType } from "../types/chat";
import type { ApiMessage } from "../types/api";

export function generateChatTitle(messages: MessageType[]): string {
  const firstUserMessage = messages.find(m => m.type === "user");
  if (!firstUserMessage) return "New Chat";
  
  const content = firstUserMessage.content;
  return content.length > 50 ? content.slice(0, 50) + "..." : content;
}

export function formatMessageForApi(message: MessageType): ApiMessage {
  return {
    role: message.type === "user" ? "user" : "assistant",
    content: message.type === "coach" ? `${message.coach}: ${message.content}` : message.content,
  };
}

export function createUserMessage(content: string): MessageType {
  return {
    id: Date.now(),
    type: "user",
    content,
    timestamp: new Date(),
  };
}

export function createCoachMessage(coach: { name: string; emoji: string }, content = "💭 Thinking...", isStreaming = true): MessageType {
  return {
    id: Date.now(),
    type: "coach",
    coach: coach.name,
    emoji: coach.emoji,
    content,
    timestamp: new Date(),
    isStreaming,
  };
}

export function createSystemMessage(content: string, isError = false): MessageType {
  return {
    id: Date.now(),
    type: "system",
    content,
    timestamp: new Date(),
    isError,
  };
}