import { useState, useCallback } from "react";
import type { MessageType, CoachType, AvailableModel } from "../types/chat";
import type { ApiMessage, ChatParams } from "../types/api";
import { streamChatCompletion, parseStreamChunk, getAvailableModels } from "../api/openrouter";
import { formatMessageForApi, createCoachMessage } from "../utils/chat";

export function useApiClient() {
  const [availableModels] = useState<AvailableModel[]>(() => getAvailableModels());

  const sendChatMessage = useCallback(async (
    currentMessage: string,
    chatMessages: MessageType[],
    selectedCoaches: CoachType[],
    coaches: CoachType[],
    selectedModel: string,
    useReasoning: boolean,
    apiKey: string,
    onMessageUpdate: (updater: (prev: MessageType[]) => MessageType[]) => void
  ) => {
    if (!currentMessage.trim() || !apiKey) {
      throw new Error("Message and API key are required");
    }

    const currentModel = availableModels.find(m => m.id === selectedModel);
    if (useReasoning && currentModel && !currentModel.supportsReasoning) {
      throw new Error("Selected model does not support reasoning mode");
    }

    const history = chatMessages.map(formatMessageForApi);
    const coachesToQuery = selectedCoaches.length ? selectedCoaches : coaches;

    await Promise.all(
      coachesToQuery.map(async (coach, i) => {
        const thinkingMessage = createCoachMessage(coach);
        const messageId = Number(`${Date.now()}${i + 1}`);
        thinkingMessage.id = messageId;
        
        onMessageUpdate(prev => [...prev, thinkingMessage]);

        try {
          const baseMessages: ApiMessage[] = [{ role: "system", content: coach.systemPrompt }];
          
          if (useReasoning && currentModel && !currentModel.nativeReasoning) {
            baseMessages.push({
              role: "system",
              content: "Think step by step and reason through your response carefully. Consider multiple angles and show your thought process before giving your final answer.",
            });
          }
          
          baseMessages.push({
            role: "user",
            content: `Previous conversation context:\n${history
              .slice(-6)
              .map((msg) => `${msg.role}: ${msg.content}`)
              .join("\n")}\n\nCurrent question: "${currentMessage}"\n\nRespond as ${coach.name} would, keeping your response ${
              useReasoning
                ? "detailed and thoughtful"
                : "concise but valuable (2-3 sentences max)"
            }. Focus on your unique expertise and perspective. You can use markdown formatting (headers, bold, italic, lists, code blocks, etc.) in your response to make it more readable.`,
          });

          const chatParams: ChatParams = {
            model: selectedModel,
            messages: baseMessages,
            maxTokens: useReasoning 
              ? (currentModel?.nativeReasoning ? 4000 : 2000) 
              : 500,
            temperature: 0.7,
            stream: true,
          };

          if (currentModel && currentModel.nativeReasoning) {
            chatParams.messages = baseMessages.filter((m) => m.role !== "system");
            chatParams.messages[0] = {
              role: "user",
              content: `${coach.systemPrompt}\n\n${chatParams.messages[0].content}`,
            };
            delete chatParams.temperature;
          }

          const stream = await streamChatCompletion(chatParams, apiKey);
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          let accumulator = "";

          onMessageUpdate(prev =>
            prev.map(m =>
              m.id === messageId ? { ...m, content: "", isStreaming: true } : m
            )
          );

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const content = parseStreamChunk(chunk);
            
            if (content) {
              accumulator += content;
              onMessageUpdate(prev =>
                prev.map(m =>
                  m.id === messageId && m.type === "coach"
                    ? { ...m, content: accumulator, isStreaming: true }
                    : m
                )
              );
            }
          }

          onMessageUpdate(prev =>
            prev.map(m =>
              m.id === messageId && m.type === "coach"
                ? { ...m, isStreaming: false }
                : m
            )
          );
        } catch (coachErr: unknown) {
          onMessageUpdate(prev =>
            prev.map(m =>
              m.id === messageId && m.type === "coach"
                ? {
                    ...m,
                    content: `❌ Error: ${coachErr instanceof Error ? coachErr.message : "Failed to get response"}`,
                    isStreaming: false,
                    isError: true,
                  }
                : m
            )
          );
        }
      })
    );
  }, [availableModels]);

  return {
    availableModels,
    sendChatMessage,
  };
}