import React, { useState } from "react";
import { X, Search } from "lucide-react";
import Fuse from "fuse.js";
import type { AvailableModel } from "../../types/chat";

interface ModelSelectorModalProps {
  isOpen: boolean;
  models: AvailableModel[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  onClose: () => void;
}

export function ModelSelectorModal({
  isOpen,
  models,
  selectedModel,
  onModelSelect,
  onClose,
}: ModelSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const search = searchQuery.trim();
  let filteredModels = models;
  
  if (search) {
    const fuse = new Fuse(models, {
      keys: ["name", "id", "category"],
      threshold: 0.4,
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

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Select AI Model</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            Object.entries(groupedModels).map(([category, categoryModels]) => (
              <div key={category}>
                <div className="px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
                  {category}
                </div>
                {categoryModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
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
}