import { useState, useEffect, useCallback } from "react";
import type { ChatHistory, MessageType, CoachType } from "../types/chat";
import { useLocalStorage } from "./useLocalStorage";
import { generateChatTitle } from "../utils/chat";
import { removeFromStorage } from "../utils/storage";

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useLocalStorage<ChatHistory[]>("ai_coaches_chat_history", []);
  const [currentChatId, setCurrentChatId] = useLocalStorage<string | null>("ai_coaches_current_chat_id", null);
  const [chatMessages, setChatMessages] = useState<MessageType[]>([]);

  // Load current chat when history and ID are available
  useEffect(() => {
    if (currentChatId && chatHistory.length > 0) {
      const chat = chatHistory.find(c => c.id === currentChatId);
      if (chat) {
        console.log("Loading chat on startup:", chat.id, "with", chat.messages.length, "messages");
        setChatMessages(chat.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } else {
        console.log("Current chat ID not found in history:", currentChatId);
      }
    }
  }, [currentChatId, chatHistory]);

  // Auto-save chat when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log("Auto-saving chat due to messages change...");
        saveCurrentChat();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [chatMessages]);

  // Force save on unload
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
  }, [chatMessages]);

  const saveCurrentChat = useCallback((selectedCoaches: CoachType[] = [], model = "openai/gpt-4.1-mini", useReasoning = false) => {
    if (chatMessages.length === 0) {
      console.log("No messages to save");
      return;
    }
    
    const title = generateChatTitle(chatMessages);
    
    const chat: ChatHistory = {
      id: currentChatId || Date.now().toString(),
      title,
      messages: chatMessages,
      createdAt: currentChatId 
        ? chatHistory.find(c => c.id === currentChatId)?.createdAt || new Date()
        : new Date(),
      updatedAt: new Date(),
      selectedCoaches: selectedCoaches.map(c => c.id),
      model,
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
  }, [chatMessages, currentChatId, chatHistory, setChatHistory, setCurrentChatId]);

  const newChat = useCallback(() => {
    console.log("Creating new chat");
    if (chatMessages.length > 0) {
      saveCurrentChat();
    }
    setChatMessages([]);
    setCurrentChatId(null);
    removeFromStorage("ai_coaches_selected_coach_ids");
  }, [chatMessages, saveCurrentChat, setChatMessages, setCurrentChatId]);

  const loadChat = useCallback((chatId: string, onCoachesChange?: (coaches: CoachType[]) => void, onModelChange?: (model: string) => void, onReasoningChange?: (reasoning: boolean) => void) => {
    console.log("Loading chat:", chatId);
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) {
      console.error("Chat not found:", chatId);
      return;
    }
    
    console.log("Found chat, loading", chat.messages.length, "messages");
    setChatMessages(chat.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })));
    setCurrentChatId(chatId);
    
    // Notify parent components of changes
    if (onModelChange) onModelChange(chat.model);
    if (onReasoningChange) onReasoningChange(chat.useReasoning);
    
    console.log("Chat loaded and preferences updated");
  }, [chatHistory, setChatMessages, setCurrentChatId]);

  const deleteChat = useCallback((chatId: string) => {
    console.log("Deleting chat:", chatId);
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setChatMessages([]);
      removeFromStorage("ai_coaches_selected_coach_ids");
      console.log("Cleared current chat ID and selected coaches");
    }
  }, [chatHistory, currentChatId, setChatHistory, setCurrentChatId, setChatMessages]);

  return {
    chatHistory,
    currentChatId,
    chatMessages,
    setChatMessages,
    saveCurrentChat,
    newChat,
    loadChat,
    deleteChat,
  };
}