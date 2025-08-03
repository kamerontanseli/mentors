export interface CoachType {
  id: number;
  name: string;
  emoji: string;
  systemPrompt: string;
}

export interface MessageType {
  id: number;
  type: "user" | "coach" | "system";
  content: string;
  timestamp: Date;
  coach?: string;
  emoji?: string;
  isError?: boolean;
  isStreaming?: boolean;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: MessageType[];
  createdAt: Date;
  updatedAt: Date;
  selectedCoaches: number[];
  model: string;
  useReasoning: boolean;
}

export interface AvailableModel {
  id: string;
  name: string;
  category: string;
  supportsReasoning: boolean;
  nativeReasoning?: boolean;
}