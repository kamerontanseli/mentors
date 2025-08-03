import React, { useState } from "react";

interface ApiKeyModalProps {
  isOpen: boolean;
  currentApiKey: string;
  onSave: (apiKey: string) => void;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, currentApiKey, onSave, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(apiKey);
    onClose();
  };

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
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Save & Continue
          </button>
          {currentApiKey && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}