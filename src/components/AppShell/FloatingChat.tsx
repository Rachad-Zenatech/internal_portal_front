import { useEffect, useRef, useState } from "react";
import { Send, Bot, X, Minimize2, Paperclip, FileText, Sparkles } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Message, MessageAvatar, MessageContent, MessageGroup } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { motion } from "framer-motion";
import { 
  MessageScrollerProvider, 
  MessageScroller, 
  MessageScrollerViewport, 
  MessageScrollerContent, 
  MessageScrollerItem,
  MessageScrollerButton
} from "@/components/ui/message-scroller";
import { useAuth } from "@/lib/AuthContext";

const MotionMessageScrollerItem = motion.create(MessageScrollerItem);

type Message = {
  role: "user" | "assistant";
  content: string;
  file?: { name: string; type: string };
};

type ChatMutationInput = {
  message: string;
  history: Message[];
  fileData?: string;
  mimeType?: string;
};

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const SUGGESTIONS = [
  "Show pending approvals",
  "Generate a reconciliation report",
  "Show chart of accounts",
  "Generate an annual report",
];

export default function FloatingChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Dimensions and position
  const [size, setSize] = useState({ width: 380, height: 600 });
  const isResizing = useRef(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello, I’m ZenaBot 🤖. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as WindowWithWebkitAudio).webkitAudioContext;
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

  const chatMutation = useMutation<string, Error, ChatMutationInput>({
    mutationFn: async ({ message, history, fileData, mimeType }) => {
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
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, loading, isOpen]);



  useEffect(() => {
    const handleAskAi = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      const query = customEvent.detail.query;
      if (!query) return;
      
      setIsOpen(true);
      setHasUnread(false);
      
      // Send the query automatically
      sendMessage(query);
    };

    window.addEventListener("ask-ai", handleAskAi);
    return () => window.removeEventListener("ask-ai", handleAskAi);
  }, [messages, loading, attachedFile]); // Bind to latest state so sendMessage isn't stale

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question && !attachedFile) return;
    if (loading) return;

    const fileToSend = attachedFile;
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
              <Bot className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">ZenaBot</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <MessageScrollerProvider>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport className="custom-scrollbar">
                <MessageScrollerContent className="p-4">
                  <MessageGroup>
              {messages.map((message, index) => (
                <MotionMessageScrollerItem 
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  scrollAnchor={index === messages.length - 1 && !loading}
                >
                  <Message
                    align={message.role === "user" ? "end" : "start"}
                  >
                    <MessageAvatar className={message.role === "user" ? "h-8 w-8 min-w-8 shrink-0 overflow-hidden rounded-full border border-border/50 shadow-sm" : "h-8 w-8 min-w-8 shrink-0 bg-blue-100 text-blue-600 overflow-hidden rounded-full shadow-sm"}>
                    {message.role === "user" ? (
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Bot size={18} />
                    )}
                  </MessageAvatar>
                  <MessageContent>
                    {message.file && (
                      <Bubble variant={message.role === "user" ? "default" : "outline"} className="mb-1">
                        <BubbleContent>
                          <div className="flex items-center gap-3 w-fit">
                            <div className="h-10 w-10 shrink-0 bg-red-500 rounded-[10px] flex items-center justify-center">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-[120px] pr-4">
                              <span className="text-sm font-bold truncate leading-tight">{message.file.name}</span>
                              <span className="text-xs uppercase mt-0.5 opacity-80">
                                {message.file.name.split('.').pop() || "FILE"}
                              </span>
                            </div>
                          </div>
                        </BubbleContent>
                      </Bubble>
                    )}
                    {message.content && (
                      <Bubble variant={message.role === "user" ? "default" : "muted"}>
                        <BubbleContent>
                          {message.content}
                        </BubbleContent>
                      </Bubble>
                    )}
                    </MessageContent>
                  </Message>
                </MotionMessageScrollerItem>
              ))}

              {loading && (
                <MotionMessageScrollerItem
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  scrollAnchor={true}
                >
                  <Message align="start">
                    <MessageAvatar className="h-8 w-8 min-w-8 shrink-0 bg-blue-100 text-blue-600 overflow-hidden rounded-full shadow-sm">
                    <Bot size={18} />
                  </MessageAvatar>
                  <MessageContent>
                    <Bubble variant="muted">
                      <BubbleContent>
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                          Thinking...
                        </div>
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
                </MotionMessageScrollerItem>
              )}
              <div ref={endRef} />
            </MessageGroup>
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

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
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            setHasUnread(false);
          }
        }}
        className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 relative"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
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
