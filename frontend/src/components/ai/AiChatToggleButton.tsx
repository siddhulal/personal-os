"use client";

import { Sparkles } from "lucide-react";
import { useAiChat } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

export function AiChatToggleButton() {
  const { isOpen, toggleChat } = useAiChat();

  if (isOpen) return null;

  return (
    <button
      onClick={toggleChat}
      className={cn(
        "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg",
        "flex items-center justify-center transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
      title="Open AI Chat"
    >
      <Sparkles className="w-5 h-5" />
    </button>
  );
}
