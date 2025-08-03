import React from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Ask your coaches anything...",
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 px-2.5 py-1.5 text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={14} />
      </button>
    </div>
  );
}