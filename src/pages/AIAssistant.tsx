// src/pages/AiAssistant.tsx
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Show pending approvals",
  "Generate a reconciliation report",
  "Show chart of accounts",
  "Generate an annual report",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I’m your Zenatech AI Assistant. How can I help?",
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

  async function sendMessage(text: string) {
    const question = text.trim();

    if (!question || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: question,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await askAi(question);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response,
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong while contacting the AI backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  
async function askAi(message: string): Promise<string> {
  const response = await fetch("http://localhost:8000/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  const data = await response.json();

  return data.reply;
}

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col p-6">
      <h1 className="text-3xl font-bold mb-4">AI Assistant</h1>

      <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
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
            placeholder="Ask about approvals, reports, bank statements..."
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
