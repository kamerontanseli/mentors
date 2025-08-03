import React from "react";
import { MessageCircle, RotateCcw, Settings } from "lucide-react";

type TabType = "chat" | "history" | "settings";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "history" as const, label: "History", icon: RotateCcw },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} className="mx-auto mb-1" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}