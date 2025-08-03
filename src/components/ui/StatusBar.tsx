import React from "react";
import type { AvailableModel } from "../../types/chat";

interface StatusBarProps {
  currentModel?: AvailableModel;
  hasApiKey: boolean;
}

export function StatusBar({ currentModel, hasApiKey }: StatusBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[160px] truncate">
            {currentModel?.name || "Unknown Model"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasApiKey && (
            <div className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              ✓ API Connected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}