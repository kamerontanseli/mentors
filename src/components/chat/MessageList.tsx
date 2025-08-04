import React, { useRef, useEffect } from "react";
import { marked } from "marked";
import { User, Bot, Copy } from "lucide-react";
import type { MessageType } from "../../types/chat";

interface MessageListProps {
  messages: MessageType[];
  onCopyMessage?: (content: string) => Promise<void>;
}

export function MessageList({ messages, onCopyMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Only scroll if user is close to the bottom
      const threshold = 150; // pixels
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + threshold;
      
      if (isScrolledToBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleCopy = async (content: string, buttonElement: HTMLButtonElement) => {
    if (!onCopyMessage) return;
    
    const original = buttonElement.innerHTML;
    try {
      await onCopyMessage(content);
      buttonElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      buttonElement.classList.add('bg-green-100','hover:bg-green-100','text-green-700');
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      buttonElement.innerHTML = original;
      buttonElement.classList.remove('bg-green-100','hover:bg-green-100','text-green-700');
    }
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-2 ${
            message.type === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`flex gap-2 max-w-[90%] ${
              message.type === "user" ? "flex-row-reverse" : ""
            }`}
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

              {onCopyMessage && (
                <button
                  onClick={(e) => handleCopy(message.content, e.currentTarget)}
                  className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                    message.type === "user" || message.isError
                      ? "hover:bg-white/20 text-white"
                      : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                  }`}
                  title="Copy message"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}