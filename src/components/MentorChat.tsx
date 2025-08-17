import React, { useState, useEffect, useRef } from "react";
import { Groq } from "groq-sdk";
import { Send, Copy, RefreshCw, Check } from "lucide-react";
import { marked } from "marked";

import { Mentor } from "./MentorList";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mentor?: Mentor; // only for assistant messages
}

interface MentorChatProps {
  mentors: Mentor[];
  apiKey: string;
}

export const MentorChat: React.FC<MentorChatProps> = ({ mentors, apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("chatMessages");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          role: "user" | "assistant";
          content: string;
          timestamp: string;
          mentor?: Mentor;
        }[];
        const restored = parsed.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(restored);
      } catch (e) {
        console.error("Failed to parse stored messages", e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const toStore = messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));
    localStorage.setItem("chatMessages", JSON.stringify(toStore));
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem("chatMessages");
  };

  // Scroll to bottom only when new messages are added (not on regeneration)
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Wrap any tables in overflow container after messages update
  useEffect(() => {
    const tables = document.querySelectorAll(".markdown table");
    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("overflow-x-auto")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "overflow-x-auto";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const updatedHistory = [...messages, userMsg];
      const assistantPromises = mentors.map((mentor) =>
        fetchAssistantResponse(updatedHistory, mentor).then((content) => ({
          role: "assistant" as const,
          content,
          timestamp: new Date(),
          mentor,
        })),
      );
      const assistantMsgs = await Promise.all(assistantPromises);
      setMessages((prev) => [...prev, ...assistantMsgs]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSystemPrompt = (mentor: Mentor): string => {
    switch (mentor.name) {
      case "David Goggins":
        return `You are David Goggins, a former Navy SEAL and ultra‑endurance athlete. Reply as if sending a quick text message: short, punchy, extremely motivating, brutally honest, and focused on mental toughness. Keep it concise and push the user to "stay hard".`;
      case "Jocko Willink":
        return `You are Jocko Willink, a retired Navy SEAL officer and leadership author. Respond in a text‑message style: disciplined, direct, emphasizing ownership and extreme discipline. Use short, commanding sentences as if texting.`;
      case "Tim Ferriss":
        return `You are Tim Ferriss, author of "The 4‑Hour Workweek" and a productivity hacker. Answer in a casual text‑message tone: give quick, practical life‑hacks, experiments, and data‑driven advice. Be curious and ask probing questions in short messages.`;
      case "Marcus Aurelius":
        return `You are Marcus Aurelius, Roman Emperor and Stoic philosopher. Respond as if texting: calm, reflective wisdom in short bursts, referencing Stoic principles. Encourage inner tranquility in concise messages.`;
      default:
        return `You are an AI mentor. Respond in a helpful, friendly manner.`;
    }
  };

  const fetchAssistantResponse = async (
    msgHistory: Message[],
    mentor: Mentor,
  ) => {
    if (!apiKey) throw new Error("Groq API key not set");
    const groq = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
      maxRetries: 3,
    });
    const systemPrompt = getSystemPrompt(mentor);
    try {
      const chatCompletion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          ...msgHistory.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.6,
        max_completion_tokens: 8192,
        tool_choice: "none",
        top_p: 1,
        reasoning_effort: "medium",
        stop: null,
      });
      const fullContent =
        (chatCompletion as any).choices?.[0]?.message?.content ?? "";
      return fullContent.trim();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .catch((err) => console.error("Copy to clipboard failed:", err));
  };

  const handleRegenerate = async (index: number) => {
    const priorMessages = messages.slice(0, index);
    setLoading(true);
    try {
      const mentorForRegeneration = messages[index].mentor as Mentor;
      const newContent = await fetchAssistantResponse(
        priorMessages,
        mentorForRegeneration,
      );
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[index] = {
          ...newMsgs[index],
          content: newContent,
          timestamp: new Date(),
        } as Message;
        return newMsgs;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-primary text-primary">
      {/* Header */}
      <header className="header">
        <span className="text-sm font-medium">Group chat</span>
        <button
          onClick={handleNewChat}
          className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
        >
          New Chat
        </button>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const containerClass = isUser
            ? "flex justify-end"
            : "flex justify-start";
          const avatar =
            !isUser && msg.mentor ? (
              <div className="avatar mr-2">{msg.mentor.emoji}</div>
            ) : null;
          return (
            <div key={idx} className={containerClass}>
              {!isUser && avatar}
              <div className="max-w-xs">
                <div className={`bubble ${isUser ? "user" : "ai"} markdown`}>
                  {isUser ? (
                    <div>{msg.content}</div>
                  ) : (
                    <>
                      <div className="text-xs font-medium mb-1">
                        {msg.mentor?.name}
                      </div>
                      <div
                        className="break-words"
                        dangerouslySetInnerHTML={{
                          __html: marked(msg.content),
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center text-xs text-secondary mt-2 space-x-2">
                  <span className="text-sm">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={() => {
                      handleCopy(msg.content);
                      setCopiedIdx(idx);
                      setTimeout(() => setCopiedIdx(null), 2000);
                    }}
                    title="Copy"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-4 h-4 text-green-500 animate-bounce" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {!isUser && (
                    <button
                      onClick={() => handleRegenerate(idx)}
                      title="Regenerate"
                      disabled={loading}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start mb-2">
            <div className="max-w-xs">
              <div className="bubble ai markdown">
                <span className="animate-pulse">Typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <footer className="input-bar">
        <input
          type="text"
          placeholder="Message..."
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="send-btn"
          title="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
};
