import { useEffect, useRef, useState } from "react";
import { Send, Bot, X, Minimize2, Paperclip, Sparkles, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, MessageAvatar, MessageContent, MessageGroup } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageScrollerProvider, 
  MessageScroller, 
  MessageScrollerViewport, 
  MessageScrollerContent, 
  MessageScrollerItem,
  MessageScrollerButton
} from "@/components/ui/message-scroller";
import { Attachment } from "@/components/ui/attachment";

import { 
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { useStreamingChat } from "@/hooks/useStreamingChat";

const MotionMessageScrollerItem = motion.create(MessageScrollerItem);

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
  
  const { messages, setMessages, isStreaming, sendMessage, stopStreaming } = useStreamingChat();
  
  // Dimensions and position
  const [size, setSize] = useState({ width: 380, height: 600 });
  const isResizing = useRef(false);

  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hello, I’m ZenaBot 🤖. How can I assist you today?",
        },
      ]);
    }
  }, [messages.length, setMessages]);

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, isStreaming, isOpen]);

  useEffect(() => {
    if (!isOpenRef.current && !isStreaming && messages.length > 1) {
       // if finished streaming and not open, play sound
       // Note: better logic might be needed, keeping simple for now
       setHasUnread(true);
       playNotificationSound();
    }
  }, [isStreaming]);

  useEffect(() => {
    const handleAskAi = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      const query = customEvent.detail.query;
      if (!query) return;
      
      setIsOpen(true);
      setHasUnread(false);
      
      handleSend(query);
    };

    window.addEventListener("ask-ai", handleAskAi);
    return () => window.removeEventListener("ask-ai", handleAskAi);
  }, [messages, isStreaming, attachedFile]); // Bind to latest state

  async function handleSend(text: string) {
    if (isStreaming) return;
    
    let fileData: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;
    let fileExt: string | undefined;

    if (attachedFile) {
      try {
        fileName = attachedFile.name;
        fileExt = attachedFile.name.split('.').pop() || "FILE";
        mimeType = attachedFile.type;
        const arrayBuffer = await attachedFile.arrayBuffer();
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
    
    setInput("");
    setAttachedFile(null);
    sendMessage(text, fileData, mimeType, fileName, fileExt);
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
      <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-4 relative origin-bottom-right"
        >
        <MessageScrollerProvider>
          <Card 
            className="shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl flex flex-col overflow-hidden relative gap-0 bg-background/80 backdrop-blur-xl border border-white/20 dark:border-white/10"
            style={{ width: size.width, height: size.height }}
          >
            {/* Resize Handle Top-Left */}
            <div 
              onMouseDown={startResizing}
              className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-10"
            />

            <CardHeader className="gap-1 border-b border-border/30 pb-3 px-5 pt-5 shrink-0 bg-gradient-to-b from-background/50 to-transparent">
              <CardTitle className="flex items-center gap-2 text-base font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 filter drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                ZenaBot
              </CardTitle>
              <CardAction>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50 rounded-full" onClick={() => setIsOpen(false)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <MessageScroller className="h-full">
                <MessageScrollerViewport className="custom-scrollbar">
                  <MessageScrollerContent className="p-4">
                    <MessageGroup>
              {messages.map((message, index) => (
                  <MotionMessageScrollerItem 
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  scrollAnchor={index === messages.length - 1 && !isStreaming}
                >
                  <Message
                    align={message.role === "user" ? "end" : "start"}
                  >
                    <MessageAvatar className={message.role === "user" ? "h-8 w-8 min-w-8 shrink-0 overflow-hidden rounded-full border border-blue-100 dark:border-blue-900 shadow-sm ring-2 ring-blue-50 dark:ring-blue-950" : "h-8 w-8 min-w-8 shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 dark:from-blue-900 dark:to-indigo-900 dark:text-blue-400 overflow-hidden rounded-full shadow-sm"}>
                    {message.role === "user" ? (
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Bot size={18} />
                    )}
                  </MessageAvatar>
                  <MessageContent>
                    {message.file && (
                      <Attachment 
                        name={message.file.name} 
                        type={message.file.name.split('.').pop() || "FILE"} 
                        className="mb-1"
                      />
                    )}
                    {message.content && (
                      <Bubble 
                        variant={message.role === "user" ? "default" : "muted"}
                        className={message.role === "user" ? "[&>[data-slot=bubble-content]]:bg-gradient-to-br [&>[data-slot=bubble-content]]:from-blue-600 [&>[data-slot=bubble-content]]:to-indigo-600 [&>[data-slot=bubble-content]]:text-white [&>[data-slot=bubble-content]]:shadow-md [&>[data-slot=bubble-content]]:border-none" : "[&>[data-slot=bubble-content]]:bg-muted/50 [&>[data-slot=bubble-content]]:shadow-sm [&>[data-slot=bubble-content]]:border [&>[data-slot=bubble-content]]:border-border/50"}
                      >
                        <BubbleContent>
                          {message.content}
                          {isStreaming && index === messages.length - 1 && message.role === "assistant" && (
                            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
                          )}
                        </BubbleContent>
                      </Bubble>
                    )}
                    {message.toolStatus && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        {message.toolStatus}
                      </div>
                    )}
                    </MessageContent>
                  </Message>
                </MotionMessageScrollerItem>
              ))}

              <div ref={endRef} />
            </MessageGroup>
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>

            {messages.length === 1 && (
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex flex-wrap gap-2 pointer-events-none justify-start">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSend(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/50 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 pointer-events-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {item}
                  </button>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-2 p-4 shrink-0 bg-gradient-to-t from-background via-background to-transparent border-t-0 pt-0 relative z-20">
            {attachedFile && (
              <div className="w-full px-3 py-2 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2">
                <span className="text-xs font-medium text-foreground flex items-center gap-2 truncate">
                  <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{attachedFile.name}</span>
                </span>
                <button 
                  onClick={() => setAttachedFile(null)} 
                  className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted shrink-0 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="w-full flex flex-col rounded-2xl bg-muted/40 backdrop-blur-md shadow-inner border border-border/50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-background/80 transition-all duration-300"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="w-full resize-none bg-transparent px-4 py-3 outline-none text-sm min-h-[60px] custom-scrollbar"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
              />
              <div className="flex items-center justify-between p-2 pt-0">
                <label className="cursor-pointer text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 shrink-0 ml-1">
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
                {isStreaming ? (
                  <Button
                    type="button"
                    onClick={stopStreaming}
                    className="h-9 w-9 rounded-full p-0 shrink-0 bg-gradient-to-tr from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-md mr-1 transition-all hover:scale-105 active:scale-95 animate-in zoom-in"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={(!input.trim() && !attachedFile) || isStreaming}
                    className="h-9 w-9 rounded-full p-0 shrink-0 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md disabled:opacity-50 mr-1 transition-all hover:scale-105 active:scale-95 animate-in zoom-in"
                  >
                    <Send className="w-4 h-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                )}
              </div>
            </form>
          </CardFooter>
        </Card>
        </MessageScrollerProvider>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            setHasUnread(false);
          }
        }}
        className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_4px_20px_rgba(79,70,229,0.4)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Bot className="h-6 w-6 group-hover:animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-background"></span>
          </span>
        )}
      </button>
    </div>
  );
}
