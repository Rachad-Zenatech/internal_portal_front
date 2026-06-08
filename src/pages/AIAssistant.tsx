// src/pages/AiAssistant.tsx

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What can you help me with?",
  "Summarize my data",
  "Generate a report",
  "Show recent activity",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Assistant. How can I help?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const question = text.trim();

    if (!question || loading) return;

    const nextMessages = [
      ...messages,
      {
        role: "user" as const,
        content: question,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // Replace with API call
      const response = await fakeAiResponse(question);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  async function fakeAiResponse(question: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return `You asked: "${question}"`;
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col p-6">
      <h1 className="text-3xl font-bold mb-4">AI Assistant</h1>

      <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                onClick={() => sendMessage(item)}
                className="flex items-center gap-1 px-3 py-2 text-xs border rounded-full hover:bg-gray-100"
              >
                <Sparkles className="w-3 h-3" />
                {item}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t p-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 border rounded-lg px-3 py-2 outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white px-4 rounded-lg disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
