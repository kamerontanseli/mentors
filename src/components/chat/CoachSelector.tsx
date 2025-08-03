import React from "react";
import type { CoachType } from "../../types/chat";

interface CoachSelectorProps {
  coaches: CoachType[];
  selectedCoaches: CoachType[];
  onSelectionChange: (coaches: CoachType[]) => void;
}

export function CoachSelector({
  coaches,
  selectedCoaches,
  onSelectionChange,
}: CoachSelectorProps) {
  const toggleCoach = (coach: CoachType) => {
    const isSelected = selectedCoaches.some((c) => c.id === coach.id);
    const newSelection = isSelected
      ? selectedCoaches.filter((c) => c.id !== coach.id)
      : [...selectedCoaches, coach];
    onSelectionChange(newSelection);
  };

  return (
    <div className="bg-white border-t border-gray-200 px-3 py-1.5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        {coaches.map((coach) => {
          const isSelected = selectedCoaches.some((c) => c.id === coach.id);
          return (
            <button
              key={coach.id}
              onClick={() => toggleCoach(coach)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                isSelected
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <span>{coach.emoji}</span>
              <span className="mr-1">{coach.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}