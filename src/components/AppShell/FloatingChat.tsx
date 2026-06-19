import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, MessageCircle, X, Maximize2, Minimize2, Paperclip, FileText } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";

type Message = {
  role: "user" | "assistant";
  content: string;
  file?: { name: string; type: string };
};

const SUGGESTIONS = [
  "Show pending approvals",
  "Generate a reconciliation report",
  "Show chart of accounts",
  "Generate an annual report",
];

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Dimensions and position
  const [size, setSize] = useState({ width: 380, height: 600 });
  const isResizing = useRef(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I’m your Zenatech AI Assistant. How can I help?",
    },
  ]);  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Could not play sound", e);
    }
  };

  const chatMutation = useMutation({
    mutationFn: async ({ message, history, fileData, mimeType }: any) => {
      const data = await apiClient.post<{reply: string}>("/ai/chat", {
        message,
        history,
        file_data: fileData,
        mime_type: mimeType,
      });
      return data.reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong while contacting the AI backend." },
      ]);
    },
    onSettled: () => {
      if (!isOpenRef.current) {
        setHasUnread(true);
        playNotificationSound();
      }
    }
  });

  const loading = chatMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnread(false);
    }
  }, [messages, loading, isOpen]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question && !attachedFile) return;
    if (loading) return;

    const fileToSend = attachedFile;
    let messageContent = question;
    if (fileToSend) {
      const fileStr = `[Attached File: ${fileToSend.name}]`;
      messageContent = messageContent ? `${messageContent}\n\n${fileStr}` : fileStr;
    }

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: question,
        file: fileToSend ? { name: fileToSend.name, type: fileToSend.type } : undefined,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setAttachedFile(null);

    let fileData: string | undefined;
    let mimeType: string | undefined;

    if (fileToSend) {
      try {
        mimeType = fileToSend.type;
        const arrayBuffer = await fileToSend.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const chunk = 8192;
        let base64String = "";
        for (let i = 0; i < uint8Array.length; i += chunk) {
          base64String += String.fromCharCode.apply(null, Array.from(uint8Array.slice(i, i + chunk)));
        }
        fileData = btoa(base64String);
      } catch (e) {
        console.error("Failed to read file", e);
      }
    }

    chatMutation.mutate({
      message: question,
      history: messages,
      fileData,
      mimeType
    });
  }

  // Handle Resize
  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const stopResizing = () => {
      isResizing.current = false;
    };

    const resize = (e: MouseEvent) => {
      if (isResizing.current) {
        // Calculate new size based on bottom-right anchor
        const newWidth = window.innerWidth - e.clientX - 24; // 24 is right-6 (1.5rem)
        const newHeight = window.innerHeight - e.clientY - 96; // 96 is bottom-24 (6rem)

        setSize({
          width: Math.max(300, Math.min(newWidth, window.innerWidth - 48)),
          height: Math.max(400, Math.min(newHeight, window.innerHeight - 120)),
        });
      }
    };

    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div 
          className="bg-card text-card-foreground border border-border shadow-xl rounded-2xl flex flex-col overflow-hidden mb-4 transition-shadow relative animate-pop-in origin-bottom-right"
          style={{ width: size.width, height: size.height }}
        >
          {/* Resize Handle Top-Left */}
          <div 
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-10"
          />

          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col gap-2 ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {message.file && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-border max-w-[85%] bg-card text-card-foreground shadow-sm">
                    <div className="h-10 w-10 shrink-0 bg-red-500 rounded-[10px] flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-[120px] pr-4">
                      <span className="text-sm font-bold truncate text-foreground leading-tight">{message.file.name}</span>
                      <span className="text-xs text-muted-foreground uppercase mt-0.5">
                        {message.file.name.split('.').pop() || "FILE"}
                      </span>
                    </div>
                  </div>
                )}
                {message.content && (
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {item}
                </button>
              ))}
            </div>
          )}

          {attachedFile && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground flex items-center gap-2 truncate">
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate">{attachedFile.name}</span>
              </span>
              <button 
                onClick={() => setAttachedFile(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t border-border bg-card flex gap-2 items-center"
          >
            <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted shrink-0">
              <Paperclip className="h-4 w-4" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAttachedFile(e.target.files[0]);
                  }
                  e.target.value = "";
                }}
              />
            </label>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-muted border-none rounded-full px-4 py-2 outline-none text-sm focus-visible:ring-1 focus-visible:ring-ring min-w-0"
            />

            <Button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || loading}
              className="rounded-full h-9 w-9 p-0 shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 relative"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-card"></span>
          </span>
        )}
      </button>
    </div>
  );
}
