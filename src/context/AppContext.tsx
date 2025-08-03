import React, { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { CoachType } from "../types/chat";

interface AppContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  useReasoning: boolean;
  setUseReasoning: (enabled: boolean) => void;
  coaches: CoachType[];
  setCoaches: (coaches: CoachType[]) => void;
  selectedCoaches: CoachType[];
  setSelectedCoaches: (coaches: CoachType[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultCoaches: CoachType[] = [
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useLocalStorage<string>("openrouter_api_key", "");
  const [selectedModel, setSelectedModel] = useLocalStorage<string>("ai_coaches_selected_model", "openai/gpt-4.1-mini");
  const [useReasoning, setUseReasoning] = useLocalStorage<boolean>("ai_coaches_use_reasoning", false);
  const [coaches, setCoaches] = useLocalStorage<CoachType[]>("ai_coaches_list", defaultCoaches);
  const [selectedCoaches, setSelectedCoaches] = useLocalStorage<CoachType[]>("ai_coaches_selected_coaches", []);

  const value: AppContextType = {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}