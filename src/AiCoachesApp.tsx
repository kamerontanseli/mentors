import React, { useState } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  Brain,
  AlertCircle,
  RefreshCw,
  MessageCircle,
} from "lucide-react";

import type { CoachType } from "./types/chat";
import { AppProvider, useAppContext } from "./context/AppContext";
import { useChatHistory } from "./hooks/useChatHistory";
import { useApiClient } from "./hooks/useApiClient";
import { createUserMessage, createSystemMessage } from "./utils/chat";
import { generateCoachPrompt } from "./api/openrouter";

// Components
import { TabNavigation } from "./components/ui/TabNavigation";
import { StatusBar } from "./components/ui/StatusBar";
import { ApiKeyModal } from "./components/modals/ApiKeyModal";
import { ModelSelectorModal } from "./components/modals/ModelSelectorModal";
import { MessageList } from "./components/chat/MessageList";
import { MessageInput } from "./components/chat/MessageInput";
import { CoachSelector } from "./components/chat/CoachSelector";

function AiCoachesAppContent() {
  const {
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    useReasoning,
    setUseReasoning,
    coaches,
    setCoaches,
    selectedCoaches,
    setSelectedCoaches,
  } = useAppContext();

  const {
    chatHistory,
    currentChatId,
    chatMessages,
    setChatMessages,
    newChat,
    loadChat,
    deleteChat,
  } = useChatHistory();

  const { availableModels, sendChatMessage } = useApiClient();

  // Local state
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "settings">("chat");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCoachManager, setShowCoachManager] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Utility functions
  const getCurrentModel = () => availableModels.find(m => m.id === selectedModel);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !apiKey) {
      if (!apiKey) setShowApiKeyInput(true);
      return;
    }

    const userMessage = createUserMessage(currentMessage);
    setChatMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage("");
    setError(null);
    setIsLoading(true);

    try {
      await sendChatMessage(
        messageToSend,
        [...chatMessages, userMessage],
        selectedCoaches,
        coaches,
        selectedModel,
        useReasoning,
        apiKey,
        setChatMessages
      );
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to get responses from coaches";
      setError(errorMessage);
      setRetryCount(p => p + 1);
      setChatMessages(prev => [
        ...prev,
        createSystemMessage(`❌ Error: ${errorMessage}`, true),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const handleRetry = () => {
    setRetryCount(p => p + 1);
    setError(null);
    if (chatMessages.length > 0) {
      const lastUserMessage = [...chatMessages].reverse().find(m => m.type === "user");
      if (lastUserMessage) {
        setCurrentMessage(lastUserMessage.content);
        handleSendMessage();
      }
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = availableModels.find(m => m.id === modelId);
    if (model && model.supportsReasoning) {
      setUseReasoning(true);
    }
  };

  const addCoach = () => {
    const newCoach: CoachType = {
      id: Date.now(),
      name: "New Coach",
      emoji: "🎯",
      systemPrompt: "You are a helpful expert coach. Provide valuable advice and guidance.",
    };
    setCoaches([...coaches, newCoach]);
  };

  const updateCoach = (id: number, field: keyof CoachType, value: string) => {
    setCoaches(coaches.map(coach =>
      coach.id === id ? { ...coach, [field]: value } : coach
    ));
  };

  const deleteCoach = (id: number) => {
    setCoaches(coaches.filter(coach => coach.id !== id));
  };

  const generatePromptForCoach = async (coach: CoachType) => {
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    try {
      const prompt = await generateCoachPrompt(coach.name, coach.emoji, apiKey);
      if (prompt) {
        updateCoach(coach.id, "systemPrompt", prompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompt");
    }
  };

  const renderChat = () => {
    const currentModel = getCurrentModel();

    return (
      <div className="flex flex-col h-full">
        {chatMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="mx-auto mb-4" size={48} />
              <p className="text-xl font-semibold mb-2">Welcome to AI Coaches!</p>
              <p className="text-gray-600 mb-4">
                Get advice from Tim Ferriss, Jocko Willink, and David Goggins
              </p>
              <p className="text-sm">
                Ask questions about business, discipline, mindset, productivity, or anything else.
              </p>
              <div className="mt-4 text-xs text-gray-500">
                Using: {currentModel?.name || "Unknown Model"}
                {useReasoning && currentModel?.supportsReasoning && " (with deep reasoning)"}
                {selectedCoaches.length > 0 && ` • ${selectedCoaches.length} selected coach(es)`}
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
          </div>
        )}

        {chatMessages.length > 0 && (
          <MessageList messages={chatMessages} onCopyMessage={handleCopyMessage} />
        )}

        {isLoading && (
          <div className="p-3">
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
          </div>
        )}

        {error && (
          <div className="p-3">
            <div className="flex justify-start">
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 max-w-[90%]">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={14} />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-xs text-red-700 mt-1">{error}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleRetry}
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
          </div>
        )}

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
                onChange={(e) => setUseReasoning(e.target.checked)}
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

          <MessageInput
            value={currentMessage}
            onChange={setCurrentMessage}
            onSend={handleSendMessage}
            disabled={isLoading}
          />
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
              />
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
                onClick={() => generatePromptForCoach(coach)}
                className="px-2 py-1 text-xs border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
              >
                ✨ AI generate prompt
              </button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => (
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
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((chat) => (
                <div
                  key={chat.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    currentChatId === chat.id ? "border-blue-300 bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    loadChat(chat.id, setSelectedCoaches, setSelectedModel, setUseReasoning);
                    setActiveTab("chat");
                  }}
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
                        Updated {new Date(chat.updatedAt).toLocaleDateString()} {new Date(chat.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
      </div>
    </div>
  );

  const renderSettings = () => (
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
                    onChange={(e) => setUseReasoning(e.target.checked)}
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <StatusBar currentModel={getCurrentModel()} hasApiKey={!!apiKey} />

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && (showCoachManager ? renderCoachManager() : renderChat())}
        {activeTab === "history" && renderHistory()}
        {activeTab === "settings" && renderSettings()}
      </div>

      {activeTab === "chat" && !showCoachManager && (
        <CoachSelector
          coaches={coaches}
          selectedCoaches={selectedCoaches}
          onSelectionChange={setSelectedCoaches}
        />
      )}

      <ApiKeyModal
        isOpen={showApiKeyInput}
        currentApiKey={apiKey}
        onSave={setApiKey}
        onClose={() => setShowApiKeyInput(false)}
      />

      <ModelSelectorModal
        isOpen={showModelSelector}
        models={availableModels}
        selectedModel={selectedModel}
        onModelSelect={handleModelChange}
        onClose={() => setShowModelSelector(false)}
      />
    </div>
  );
}

const AiCoachesApp = () => {
  return (
    <AppProvider>
      <AiCoachesAppContent />
    </AppProvider>
  );
};

export default AiCoachesApp;
