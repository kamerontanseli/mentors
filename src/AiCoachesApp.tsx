import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import apiData from "./api.json";
import Fuse from "fuse.js";

import {
  MessageCircle,
  Plus,
  Trash2,
  Settings,
  Send,
  User,
  Bot,
   Copy,
   RotateCcw,  ChevronDown,
  Brain,
  X,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface CoachType {
  id: number;
  name: string;
  emoji: string;
  systemPrompt: string;
}

interface MessageType {
  id: number;
  type: "user" | "coach" | "system";
  content: string;
  timestamp: Date;
  coach?: string;
  emoji?: string;
  isError?: boolean;
  isStreaming?: boolean;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: MessageType[];
  createdAt: Date;
  updatedAt: Date;
  selectedCoaches: number[];
  model: string;
  useReasoning: boolean;
}

const AiCoachesApp = () => {
  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "settings">("chat");
  
  // --- Force save on unload ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (chatMessages.length > 0) {
        console.log("Saving before unload...");
        saveCurrentChat();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }); // Empty dependency array - only run once on mount
  
  // --- Debug logging ---
  useEffect(() => {
    console.log("=== COMPONENT MOUNTED ===");
    console.log("Initial chat history length:", chatHistory.length);
    console.log("Initial current chat ID:", currentChatId);
    console.log("Initial chat messages length:", chatMessages.length);
    
    // Check localStorage directly
    try {
      const rawHistory = localStorage.getItem("ai_coaches_chat_history");
      const rawCurrentId = localStorage.getItem("ai_coaches_current_chat_id");
      console.log("Direct localStorage check:");
      console.log("- Raw history:", rawHistory);
      console.log("- Raw current ID:", rawCurrentId);
      
      // Test localStorage write
      const testKey = "test_localstorage";
      localStorage.setItem(testKey, "test_value");
      const testValue = localStorage.getItem(testKey);
      console.log("- localStorage test:", testValue === "test_value" ? "PASS" : "FAIL");
      localStorage.removeItem(testKey);
    } catch (err) {
      console.error("Error checking localStorage directly:", err);
    }
  }, []);
  
  // --- Load chat history from localStorage on mount ---
  useEffect(() => {
    const loadChatHistory = () => {
      try {
        const saved = localStorage.getItem("ai_coaches_chat_history");
        console.log("Raw chat history from localStorage:", saved);
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log("Parsed chat history:", parsed.length, "chats");
          const processed = parsed.map((chat: ChatHistory) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages.map((msg: MessageType) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
          console.log("Processed chat history:", processed.length, "chats");
          setChatHistory(processed);
        } else {
          console.log("No chat history found in localStorage");
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
        console.error("Error details:", err);
      }
    };
    
    loadChatHistory();
  }, []); // Only run once on mount
  
  // --- Load current chat ID from localStorage on mount ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_coaches_current_chat_id");
      console.log("Loaded current chat ID from localStorage:", saved);
      setCurrentChatId(saved);
    } catch (err) {
      console.error("Error loading current chat ID:", err);
    }
  }, []);
  
  
  
  // --- Chat history state ---
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]); // Start empty, load with effect
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("ai_coaches_current_chat_id");
      console.log("Loaded current chat ID from localStorage:", saved);
      return saved;
    } catch (err) {
      console.error("Error loading current chat ID:", err);
    }
    return null;
  });
  
  // --- Missing state/refs for TS errors ---
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  function saveApiKey(): void {
    try {
      localStorage.setItem("openrouter_api_key", apiKey);
    } catch (err) {
      console.error(err);
    }
    setShowApiKeyInput(false);
  }

  // --- Utility and event handler stubs to fix TS errors ---
  function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    
    // Enable reasoning mode by default if the model supports it
    const model = availableModels.find((m) => m.id === modelId);
    if (model && model.supportsReasoning) {
      setUseReasoning(true);
      try {
        localStorage.setItem("ai_coaches_use_reasoning", "true");
      } catch (err) {
        console.error(err);
      }
    }
    
    try {
      localStorage.setItem("ai_coaches_selected_model", modelId);
    } catch (err) {
      console.error(err);
    }
    setShowModelSelector(false);
  }
  function getCurrentModel(): AvailableModel | undefined {
    return availableModels.find((m) => m.id === selectedModel);
  }
  function handleReasoningChange(enabled: boolean): void {
    setUseReasoning(enabled);
    try {
      localStorage.setItem("ai_coaches_use_reasoning", enabled.toString());
    } catch (err) {
      console.error(err);
    }
  }
  async function sendChatMessage() {
    if (!currentMessage.trim() || !apiKey) {
      if (!apiKey) setShowApiKeyInput(true);
      return;
    }

    const currentModel = getCurrentModel();
    if (useReasoning && currentModel && !currentModel.supportsReasoning) {
      setUseReasoning(false);
      return;
    }

    const userMessage: MessageType = {
      id: Date.now(),
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    const asked = currentMessage;
    setCurrentMessage("");
    setError(null);

    try {
      const history = [...chatMessages, userMessage].map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.type === "coach" ? `${m.coach}: ${m.content}` : m.content,
      }));

      const coachesToQuery = selectedCoaches.length ? selectedCoaches : coaches;

      await Promise.all(
        coachesToQuery.map(async (coach, i) => {
          const thinkingId = Number(`${Date.now()}${i + 1}`);
          const thinking: MessageType = {
            id: thinkingId,
            type: "coach",
            coach: coach.name,
            emoji: coach.emoji,
            content: "💭 Thinking...",
            timestamp: new Date(),
            isStreaming: true,
          };
          setChatMessages((prev) => [...prev, thinking]);

          try {
            const baseMessages: {
              role: "system" | "user" | "assistant";
              content: string;
            }[] = [{ role: "system", content: coach.systemPrompt }];
            if (useReasoning && currentModel && !currentModel.nativeReasoning) {
              baseMessages.push({
                role: "system",
                content:
                  "Think step by step and reason through your response carefully. Consider multiple angles and show your thought process before giving your final answer.",
              });
            }
            baseMessages.push({
              role: "user",
              content: `Previous conversation context:\n${history
                .slice(-6)
                .map((msg) => `${msg.role}: ${msg.content}`)
                .join(
                  "\n",
                )}\n\nCurrent question: "${asked}"\n\nRespond as ${coach.name} would, keeping your response ${
                useReasoning
                  ? "detailed and thoughtful"
                  : "concise but valuable (2-3 sentences max)"
              }. Focus on your unique expertise and perspective. You can use markdown formatting (headers, bold, italic, lists, code blocks, etc.) in your response to make it more readable.`,
            });

            interface ChatMessage {
              role: "system" | "user" | "assistant";
              content: string;
            }
            const body: {
              model: string;
              messages: ChatMessage[];
              max_tokens: number;
              temperature?: number;
              stream: true;
            } = {
              model: selectedModel,
              messages: baseMessages,
              max_tokens: useReasoning 
                ? (currentModel?.nativeReasoning ? 4000 : 2000) 
                : 500,
              temperature: 0.7,
              stream: true,
            };

            if (currentModel && currentModel.nativeReasoning) {
              body.messages = baseMessages.filter((m) => m.role !== "system");
              body.messages[0] = {
                role: "user",
                content: `${coach.systemPrompt}\n\n${body.messages[0].content}`,
              };
              delete body.temperature;
            }

            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": window.location.origin,
                  "X-Title": "AI Coaches App",
                },
                body: JSON.stringify(body),
              },
            );

            if (!response.ok || !response.body) {
              const errorData: { error?: { message?: string } } = await response
                .json()
                .catch(() => ({}) as { error?: { message?: string } });
              throw new Error(
                errorData.error?.message || `HTTP ${response.status}`,
              );
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let acc = "";
            const messageId = thinking.id;

            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, content: "", isStreaming: true } : m,
              ),
            );
            const cancelled = false;

            while (true) {
              const { done, value } = await reader.read();
              if (done || cancelled) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split("\n").filter((l) => l.trim());
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || "";
                    if (content) {
                      acc += content;
                      setChatMessages((prev) =>
                        prev.map((m) =>
                          m.id === messageId && m.type === "coach"
                            ? { ...m, content: acc, isStreaming: true }
                            : m,
                        ),
                      );
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
            }

            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === messageId && m.type === "coach"
                  ? { ...m, isStreaming: false }
                  : m,
              )
            );
          } catch (coachErr: unknown) {
            const messageId = thinking.id;
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === messageId && m.type === "coach"
                  ? {
                      ...m,
                      content: `❌ Error: ${coachErr instanceof Error ? coachErr.message : "Failed to get response"}`,
                      isStreaming: false,
                      isError: true,
                    }
                  : m,
              ),
            );
          }
        })
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to get responses from coaches",
      );
      setRetryCount((p) => p + 1);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "system",
          content: `❌ Error: ${e instanceof Error ? e.message : "Failed to get responses from coaches"}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    }
  }
  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
  }
  function retryLastRequest(): void {
    setRetryCount((p) => p + 1);
    setError(null);
    if (chatMessages.length > 0) {
      const last = chatMessages[chatMessages.length - 1];
      if (last.type === "user") {
        setCurrentMessage(last.content);
        sendChatMessage();
      }
    }
  }
  function saveCurrentChat(): void {
    if (chatMessages.length === 0) {
      console.log("No messages to save");
      return;
    }
    
    const firstUserMessage = chatMessages.find(m => m.type === "user");
    const title = firstUserMessage 
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
      : "New Chat";
    
    const chat: ChatHistory = {
      id: currentChatId || Date.now().toString(),
      title,
      messages: chatMessages,
      createdAt: currentChatId 
        ? chatHistory.find(c => c.id === currentChatId)?.createdAt || new Date()
        : new Date(),
      updatedAt: new Date(),
      selectedCoaches: selectedCoaches.map(c => c.id),
      model: selectedModel,
      useReasoning,
    };
    
    console.log("Saving chat:", {
      id: chat.id,
      title: chat.title,
      messagesCount: chatMessages.length,
      selectedCoaches: chat.selectedCoaches,
      model: chat.model,
      useReasoning: chat.useReasoning,
    });
    
    // Create updated history
    let updatedHistory: ChatHistory[];
    if (currentChatId) {
      updatedHistory = chatHistory.map(c => c.id === currentChatId ? chat : c);
    } else {
      updatedHistory = [...chatHistory, chat];
    }
    
    // Update state
    setChatHistory(updatedHistory);
    setCurrentChatId(chat.id);
    
    // Save to localStorage immediately
    try {
      const serializedHistory = JSON.stringify(updatedHistory);
      localStorage.setItem("ai_coaches_chat_history", serializedHistory);
      localStorage.setItem("ai_coaches_current_chat_id", chat.id);
      
      // Verify it was saved
      const verifySaved = localStorage.getItem("ai_coaches_chat_history");
      const verifyCurrentId = localStorage.getItem("ai_coaches_current_chat_id");
      
      console.log("Chat saved successfully to localStorage:");
      console.log("- Serialized history size:", serializedHistory.length, "characters");
      console.log("- Verification - saved history length:", verifySaved ? JSON.parse(verifySaved).length : "null");
      console.log("- Verification - current chat ID:", verifyCurrentId);
      console.log("- Verification - matches expected:", verifyCurrentId === chat.id);
      
    } catch (err) {
      console.error("Error saving chat to localStorage:", err);
      console.error("Error details:", err);
    }
  }

  function newChat(): void {
    console.log("Creating new chat");
    if (chatMessages.length > 0) {
      saveCurrentChat();
    }
    setChatMessages([]);
    setSelectedCoaches([]);
    setError(null);
    setRetryCount(0);
    setCurrentChatId(null);
    try {
      localStorage.removeItem("ai_coaches_current_chat_id");
      console.log("Cleared current chat ID");
    } catch (err) {
      console.error("Error clearing current chat ID:", err);
    }
  }

  function loadChat(chatId: string): void {
    console.log("Loading chat:", chatId);
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) {
      console.error("Chat not found:", chatId);
      return;
    }
    
    console.log("Found chat, loading", chat.messages.length, "messages");
    setChatMessages(chat.messages);
    setSelectedCoaches(coaches.filter(c => chat.selectedCoaches.includes(c.id)));
    setSelectedModel(chat.model);
    setUseReasoning(chat.useReasoning);
    setCurrentChatId(chatId);
    setError(null);
    setRetryCount(0);
    setActiveTab("chat");
    
    try {
      localStorage.setItem("ai_coaches_current_chat_id", chatId);
      localStorage.setItem("ai_coaches_selected_model", chat.model);
      localStorage.setItem("ai_coaches_use_reasoning", chat.useReasoning.toString());
      localStorage.setItem("ai_coaches_selected_coach_ids", JSON.stringify(chat.selectedCoaches));
      console.log("Chat loaded and preferences saved to localStorage");
    } catch (err) {
      console.error("Error saving chat preferences:", err);
    }
  }

  function deleteChat(chatId: string): void {
    console.log("Deleting chat:", chatId);
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setChatMessages([]);
      setSelectedCoaches([]);
      try {
        localStorage.removeItem("ai_coaches_current_chat_id");
        localStorage.removeItem("ai_coaches_selected_coach_ids");
        console.log("Cleared current chat ID and selected coaches");
      } catch (err) {
        console.error("Error clearing chat data:", err);
      }
    }
    
    try {
      localStorage.setItem("ai_coaches_chat_history", JSON.stringify(updatedHistory));
      console.log("Chat history updated in localStorage");
    } catch (err) {
      console.error("Error saving chat history:", err);
    }
  }
  const [coaches, setCoaches] = useState<CoachType[]>(() => {
    try {
      const saved = localStorage.getItem("ai_coaches_list");
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error(err);
    }
    return [
      {
        id: 1,
        name: "Tim Ferriss",
        emoji: "🚀",
        systemPrompt:
          "You are Tim Ferriss, automation and lifestyle expert focused on everything growth and business. You help people find the 80/20 principle in all aspects of life, automate processes, and build efficient systems. Speak with Tim's characteristic analytical approach and focus on actionable tactics.",
      },
      {
        id: 2,
        name: "Jocko Willink",
        emoji: "💪",
        systemPrompt:
          "You are Jocko Willink, leadership expert and discipline life coach. You emphasize extreme ownership, discipline, early mornings, and leading by example. Your responses are direct, no-nonsense, and focused on taking responsibility and decisive action. Always push for discipline and leadership.",
      },
      {
        id: 3,
        name: "David Goggins",
        emoji: "🔥",
        systemPrompt:
          "You are David Goggins, mindset and exercise coach aimed at pushing limits in all aspects of life. You focus on mental toughness, embracing discomfort, and breaking through perceived limitations. Your tone is intense, motivational, and challenges people to go beyond what they think is possible.",
      },
    ];
  });
  const [chatMessages, setChatMessages] = useState<MessageType[]>([]);

  // --- Auto-save chat when messages change ---
  useEffect(() => {
    if (chatMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log("Auto-saving chat due to messages change...");
        saveCurrentChat();
      }, 500); // Debounce to avoid saving too frequently
      
      return () => clearTimeout(timeoutId);
    }
  }, [chatMessages]);

  // Debug: Log when chatHistory changes
  useEffect(() => {
    console.log("chatHistory updated:", chatHistory.length, "chats");
  }, [chatHistory]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading] = useState(false);
  const [showCoachManager, setShowCoachManager] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("openrouter_api_key");
      return saved || "";
    } catch (err) {
      console.error(err);
      return "";
    }
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return (
      localStorage.getItem("ai_coaches_selected_model") ||
      "openai/gpt-4.1-mini"
    );
  } catch {
    return "openai/gpt-4.1-mini";
  }  });
  const [useReasoning, setUseReasoning] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_coaches_use_reasoning");
      if (saved) return saved === "true";
    } catch (err) {
      console.error(err);
    }
    return false;
  });
  const [selectedCoaches, setSelectedCoaches] = useState<CoachType[]>(() => {
    try {
      const ids = localStorage.getItem("ai_coaches_selected_coach_ids");
      if (ids) {
        const parsed = JSON.parse(ids) as number[];
        const initial = typeof coaches === "function" ? [] : coaches;
        const found = (initial as CoachType[]).filter((c) =>
          parsed.includes(c.id),
        );
        if (found.length) return found;
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  // Model type for availableModels
  interface AvailableModel {
    id: string;
    name: string;
    category: string;
    supportsReasoning: boolean;
    nativeReasoning?: boolean;
  }

  // Flatten models from api.json
  function getAvailableModelsFromApi(
    api: Record<
      string,
      {
        name?: string;
        models?: Record<
          string,
          {
            id: string;
            name: string;
            reasoning?: boolean;
            nativeReasoning?: boolean;
          }
        >;
      }
    >,
  ): AvailableModel[] {
    const models: AvailableModel[] = [];
    for (const providerKey in api) {
      const provider = api[providerKey];
      if (!provider.models) continue;
      for (const modelKey in provider.models) {
        const model = provider.models[modelKey];
        models.push({
          id: model.id,
          name: model.name,
          category: provider.name || providerKey,
          supportsReasoning: !!model.reasoning || false,
          nativeReasoning: !!model.nativeReasoning || false,
        });
      }
    }
    return models;
  }

  const availableModels: AvailableModel[] = getAvailableModelsFromApi({
    openrouter: apiData.openrouter,
  });

  // --- Load current chat when history and ID are available
  useEffect(() => {
    if (currentChatId && chatHistory.length > 0) {
      const chat = chatHistory.find(c => c.id === currentChatId);
      if (chat) {
        console.log("Loading chat on startup:", chat.id, "with", chat.messages.length, "messages");
        setChatMessages(chat.messages);
        setSelectedCoaches(coaches.filter(c => chat.selectedCoaches.includes(c.id)));
        setSelectedModel(chat.model);
        setUseReasoning(chat.useReasoning);
      } else {
        console.log("Current chat ID not found in history:", currentChatId);
      }
    }
  }, [currentChatId, chatHistory, coaches]);

  useEffect(() => {
    // If selectedModel is not in availableModels, set to default
    if (!availableModels.length) return;
    if (!availableModels.some((m) => m.id === selectedModel)) {
      const defaultModel = availableModels.find((m) => m.id === "openai/gpt-4.1-mini")?.id || availableModels[0].id;
      console.log("Setting default model:", defaultModel);
      setSelectedModel(defaultModel);
      
      // Enable reasoning mode by default if the default model supports it
      const model = availableModels.find((m) => m.id === defaultModel);
      if (model && model.supportsReasoning) {
        console.log("Enabling reasoning mode for default model");
        setUseReasoning(true);
        try {
          localStorage.setItem("ai_coaches_use_reasoning", "true");
        } catch (err) {
          console.error(err);
        }
      }
      
      try {
        localStorage.setItem("ai_coaches_selected_model", defaultModel);
      } catch (err) {
        console.error(err);
      }
    }
  }, [availableModels, selectedModel]);

  useEffect(() => {
    // Debug logging for available models
    console.log("Available models:", availableModels.length);
    console.log("Selected model:", selectedModel);
    console.log("Use reasoning:", useReasoning);
  }, [availableModels, selectedModel, useReasoning]);

  const renderApiKeyModal = () => {
    if (!showApiKeyInput) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">
            OpenRouter API Key Required
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            To use the AI coaches, you need an OpenRouter API key. Get one free
            at{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              openrouter.ai
            </a>
          </p>
          <p className="text-gray-500 mb-4 text-xs">
            Access to multiple AI models including GPT-4, Claude, and Gemini.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenRouter API key"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-[16px]"
          />
          <div className="flex gap-2">
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Save & Continue
            </button>
            {apiKey && (
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderModelSelectorModal = () => {
    if (!showModelSelector) return null;

    const search = modelSearch.trim();
    let filteredModels = availableModels;
    if (search) {
      const fuse = new Fuse(availableModels, {
        keys: ["name", "id", "category"],
        threshold: 0.4, // fuzzy, but not too loose
        ignoreLocation: true,
      });
      filteredModels = fuse.search(search).map((result) => result.item);
    }

    const groupedModels: Record<string, AvailableModel[]> =
      filteredModels.reduce<Record<string, AvailableModel[]>>((acc, model) => {
        if (!acc[model.category]) acc[model.category] = [];
        acc[model.category].push(model);
        return acc;
      }, {});

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Select AI Model</h3>
            <button
              onClick={() => setShowModelSelector(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-3 border-b border-gray-200 flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search models..."
              className="flex-1 px-2 py-1 text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.entries(groupedModels).length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No models found.
              </div>
            ) : (
              Object.entries(groupedModels).map(([category, models]) => (
                <div key={category}>
                  <div className="px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
                    {category}
                  </div>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${
                        selectedModel === model.id
                          ? "bg-blue-50 text-blue-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {model.supportsReasoning && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {model.nativeReasoning
                                  ? "Native Reasoning"
                                  : "Reasoning"}
                              </span>
                            )}
                            {!model.supportsReasoning && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                Fast
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {model.id}
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="text-blue-500">✓</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">
              💡 Reasoning models provide deeper analysis but may be slower and
              more expensive.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const addCoach = (): void => {
    const newCoach = {
      id: Date.now(),
      name: "New Coach",
      emoji: "🎯",
      systemPrompt:
        "You are a helpful expert coach. Provide valuable advice and guidance.",
    };
    const next = [...coaches, newCoach];
    setCoaches(next);
    try {
      localStorage.setItem("ai_coaches_list", JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
  };

  const updateCoach = (id: number, field: keyof CoachType, value: string) => {
    const next = coaches.map((coach) =>
      coach.id === id ? { ...coach, [field]: value } : coach,
    );
    setCoaches(next);
    try {
      localStorage.setItem("ai_coaches_list", JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCoach = (id: number) => {
    const next = coaches.filter((coach) => coach.id !== id);
    setCoaches(next);
    try {
      localStorage.setItem("ai_coaches_list", JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
  };

  const renderChat = () => {
    const currentModel = getCurrentModel();

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="mx-auto mb-4" size={48} />
              <p className="text-xl font-semibold mb-2">
                Welcome to AI Coaches!
              </p>
              <p className="text-gray-600 mb-4">
                Get advice from Tim Ferriss, Jocko Willink, and David Goggins
              </p>
              <p className="text-sm">
                Ask questions about business, discipline, mindset, productivity,
                or anything else.
              </p>
              <div className="mt-4 text-xs text-gray-500">
                Using: {currentModel?.name || "Unknown Model"}
                {useReasoning &&
                  currentModel?.supportsReasoning &&
                  " (with deep reasoning)"}
                {selectedCoaches.length > 0 &&
                  ` • ${selectedCoaches.length} selected coach(es)`}{" "}
              </div>
              {!apiKey && (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Setup API Key to Get Started
                </button>
              )}
            </div>
          )}

          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-2 max-w-[90%] ${message.type === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  {message.type === "user" ? (
                    <User size={14} />
                  ) : message.type === "coach" ? (
                    <span className="text-xs">{message.emoji}</span>
                  ) : (
                    <Bot size={14} />
                  )}
                </div>
                <div
                  className={`rounded-lg p-2.5 relative group ${
                    message.type === "user"
                      ? "bg-blue-500 text-white"
                      : message.isError
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.type === "coach" && (
                    <div className="font-semibold text-xs mb-1">
                      {message.coach}
                    </div>
                  )}
                  {message.type === "user" ? (
                    <div className="text-xs leading-tight whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  ) : (
                    <div
                      className="text-xs leading-tight markdown"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(message.content),
                      }}
                    />
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>

                    <button
                      onClick={async (e) => {
                        const btn = e.currentTarget as HTMLButtonElement | null;
                        if (!btn) return;
                        const original = btn.innerHTML;
                        try {
                          await copyToClipboard(message.content);
                          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                          btn.classList.add('bg-green-100','hover:bg-green-100','text-green-700');
                          await new Promise((r) => setTimeout(r, 1000));
                        } finally {
                          if (btn) {
                            btn.innerHTML = original;
                            btn.classList.remove('bg-green-100','hover:bg-green-100','text-green-700');
                          }
                        }
                      }}
                      className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        message.type === "user" || message.isError
                          ? "hover:bg-white/20 text-white"
                          : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                      }`}
                      title="Copy message"
                    >
                      <Copy size={12} />
                    </button>                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">💭</div>
                  <span className="text-xs text-gray-600">
                    {selectedCoaches.length === 1
                      ? `${selectedCoaches[0].name} is thinking...`
                      : selectedCoaches.length > 1
                        ? "Selected coaches are thinking..."
                        : "Coaches are thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 max-w-[90%]">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={14} />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-xs text-red-700 mt-1">{error}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={retryLastRequest}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    <RefreshCw size={10} />
                    Retry ({retryCount})
                  </button>
                  <button
                    onClick={newChat}
                    className="px-2 py-1 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50"
                  >
                    New Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <> </>
        <div className="border-t border-gray-200 p-3">
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              onClick={newChat}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
              title="Start new chat"
            >
              <RotateCcw size={12} />
              New Chat
            </button>

            <label
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-gray-300 rounded cursor-pointer transition-colors ${
                getCurrentModel()?.supportsReasoning
                  ? "hover:bg-gray-50"
                  : "bg-gray-100 cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={useReasoning && getCurrentModel()?.supportsReasoning}
                onChange={(e) => handleReasoningChange(e.target.checked)}
                className="rounded"
                disabled={!getCurrentModel()?.supportsReasoning}
              />
              <Brain size={12} />
              Reasoning
              {!getCurrentModel()?.supportsReasoning && (
                <span className="text-xs text-gray-500">(Not supported)</span>
              )}
            </label>

            <button
              onClick={() => setShowModelSelector(true)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              <span className="text-gray-600">Model:</span>
              <span className="font-medium text-xs">
                {getCurrentModel()?.name || "Unknown"}
              </span>
              <ChevronDown size={12} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Ask your coaches anything..."
              className="flex-1 px-2.5 py-1.5 text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendChatMessage}
              disabled={isLoading || !currentMessage.trim() || !apiKey}
              className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCoachManager = () => (
    <div className="p-3 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Manage Coaches</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            API Key
          </button>
          <button
            onClick={addCoach}
            className="flex items-center gap-1.5 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={12} />
            Add Coach
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className="border border-gray-300 rounded p-3 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={coach.emoji}
                onChange={(e) => updateCoach(coach.id, "emoji", e.target.value)}
                className="w-10 h-9 text-center text-[16px] border border-gray-300 rounded"
                maxLength={2}
              />
              <input
                type="text"
                value={coach.name}
                onChange={(e) => updateCoach(coach.id, "name", e.target.value)}
                className="flex-1 h-9 px-2 text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Coach Name"
              />{" "}
              <button
                onClick={() => deleteCoach(coach.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              value={coach.systemPrompt}
              onChange={(e) =>
                updateCoach(coach.id, "systemPrompt", e.target.value)
              }
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-[16px] resize-none"
              placeholder="System prompt describing how this coach should behave..."
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={async (e) => {
                  if (!apiKey) {
                    setShowApiKeyInput(true);
                    return;
                  }
                  const btn = e.currentTarget as HTMLButtonElement;
                  const originalText = btn.textContent;
                  btn.disabled = true;
                  btn.textContent = "Generating...";
                  btn.classList.add("opacity-60", "cursor-not-allowed");
                  const prompt = `Create a concise system prompt for an AI coach.
Name: ${coach.name || "New Coach"}
Emoji: ${coach.emoji || "🎯"}
Style: Professional, helpful, and specific.
Output only the prompt, no preface.`;
                  try {
                    const resp = await fetch(
                      "https://openrouter.ai/api/v1/chat/completions",
                      {
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
                              content:
                                "You write high quality system prompts for specialized AI coaching assistants.",
                            },
                            { role: "user", content: prompt },
                          ],
                          max_tokens: 300,
                          temperature: 0.7,
                        }),
                      },
                    );
                    if (!resp.ok) {
                      const data = await resp.json().catch(() => ({}));
                      throw new Error(
                        data?.error?.message || `HTTP ${resp.status}`,
                      );
                    }
                    const data = await resp.json();
                    const content = data?.choices?.[0]?.message?.content || "";
                    if (content)
                      updateCoach(coach.id, "systemPrompt", content.trim());
                  } catch (e) {
                    updateCoach(coach.id, "systemPrompt", "");
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to generate prompt",
                    );
                  } finally {
                    btn.disabled = false;
                    btn.textContent =
                      originalText || "Generate with GPT‑4.1 mini";
                    btn.classList.remove("opacity-60", "cursor-not-allowed");
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
              >
                ✨ AI generate prompt
              </button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>{" "}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Tabbed Navbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MessageCircle size={16} className="mx-auto mb-1" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <RotateCcw size={16} className="mx-auto mb-1" />
            History
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Settings size={16} className="mx-auto mb-1" />
            Settings
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[160px] truncate">
              {getCurrentModel()?.name || "Unknown Model"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {apiKey && (
              <div className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                ✓ API Connected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && (showCoachManager ? renderCoachManager() : renderChat())}
        {activeTab === "history" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold mb-6">Chat History</h2>
              
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <RotateCcw className="mx-auto mb-4" size={48} />
                  <p className="text-xl font-semibold mb-2">No Chat History</p>
                  <p className="text-gray-600 mb-4">
                    Your conversations will appear here
                  </p>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Start Chatting
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    .map((chat) => (
                      <div
                        key={chat.id}
                        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                          currentChatId === chat.id ? "border-blue-300 bg-blue-50" : ""
                        }`}
                        onClick={() => loadChat(chat.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 mb-1 truncate">
                              {chat.title}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                              <span>{chat.messages.length} messages</span>
                              <span>•</span>
                              <span>{chat.selectedCoaches.length} coaches</span>
                              <span>•</span>
                              <span>{availableModels.find(m => m.id === chat.model)?.name || "Unknown"}</span>
                              {chat.useReasoning && (
                                <>
                                  <span>•</span>
                                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                    Reasoning
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              Updated {chat.updatedAt.toLocaleDateString()} {chat.updatedAt.toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadChat(chat.id);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                              title="Continue chat"
                            >
                              <MessageCircle size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              title="Delete chat"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {chatHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete all chat history? This action cannot be undone.")) {
                        setChatHistory([]);
                        setCurrentChatId(null);
                        setChatMessages([]);
                        setSelectedCoaches([]);
                        setError(null);
                        setRetryCount(0);
                        try {
                          localStorage.removeItem("ai_coaches_chat_history");
                          localStorage.removeItem("ai_coaches_current_chat_id");
                          localStorage.removeItem("ai_coaches_selected_coach_ids");
                          console.log("All chat history cleared");
                        } catch (err) {
                          console.error("Error clearing chat history:", err);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    🗑️ Clear All Chats
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold mb-6">Settings</h2>
              
              <div className="space-y-6">
                {/* API Key Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">API Configuration</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">OpenRouter API Key</span>
                      <button
                        onClick={() => setShowApiKeyInput(true)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {apiKey ? "Update Key" : "Set Key"}
                      </button>
                    </div>
                    {apiKey && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✓ API key is configured
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Settings */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Model Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Model</span>
                      <button
                        onClick={() => setShowModelSelector(true)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {getCurrentModel()?.name || "Unknown"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Reasoning Mode</span>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={useReasoning && getCurrentModel()?.supportsReasoning}
                          onChange={(e) => handleReasoningChange(e.target.checked)}
                          className="rounded mr-2"
                          disabled={!getCurrentModel()?.supportsReasoning}
                        />
                        <span className="text-sm">
                          {getCurrentModel()?.supportsReasoning ? "Enabled" : "Not supported"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Coach Management */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Coach Management</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Number of Coaches</span>
                      <span className="text-sm font-medium">{coaches.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("chat");
                        setShowCoachManager(true);
                      }}
                      className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Manage Coaches
                    </button>
                  </div>
                </div>

                {/* App Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">About</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>AI Coaches App</div>
                    <div>Get advice from expert AI coaches</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Powered by OpenRouter API
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === "chat" && !showCoachManager && (
        <div className="bg-white border-t border-gray-200 px-3 py-1.5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            {coaches.map((coach) => (
              <button
                key={coach.id}
                onClick={() => {
                  const exists = selectedCoaches.some((c) => c.id === coach.id);
                  const next = exists
                    ? selectedCoaches.filter((c) => c.id !== coach.id)
                    : [...selectedCoaches, coach];
                  setSelectedCoaches(next);
                  try {
                    if (next.length)
                      localStorage.setItem(
                        "ai_coaches_selected_coach_ids",
                        JSON.stringify(next.map((c) => c.id)),
                      );
                    else
                      localStorage.removeItem("ai_coaches_selected_coach_ids");
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                  selectedCoaches.some((c) => c.id === coach.id)
                    ? "bg-blue-100 text-blue-800 border border-b border-gray-200lue-300"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <span>{coach.emoji}</span>
                <span className="mr-1">{coach.name}</span>
              </button>
            ))}{" "}
          </div>
        </div>
      )}

      {renderApiKeyModal()}
      {renderModelSelectorModal()}
    </div>
  );
};

export default AiCoachesApp;
