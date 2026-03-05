"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { useAiChat } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

export function AiChatToggleButton() {
  const { isOpen, toggleChat, pageActions } = useAiChat();
  const [showMenu, setShowMenu] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isOpen) return null;

  const hasPageActions = pageActions.length > 0;

  function handleClick() {
    if (hasPageActions) {
      setShowMenu((prev) => !prev);
    } else {
      toggleChat();
    }
  }

  function handleAction(action: typeof pageActions[0]) {
    setLoadingAction(action.action);
    setShowMenu(false);
    action.onAction();
    // Reset loading after a short delay (actual loading is handled by the page)
    setTimeout(() => setLoadingAction(null), 300);
  }

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
      {showMenu && hasPageActions && (
        <div className="absolute bottom-14 right-0 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden mb-1">
          {pageActions.map((pa) => {
            const Icon = pa.icon;
            return (
              <button
                key={pa.action}
                className="w-full px-3 py-2.5 text-sm text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2.5"
                onClick={() => handleAction(pa)}
              >
                {Icon && <Icon className="h-4 w-4 text-purple-500 shrink-0" />}
                <span>{pa.label}</span>
              </button>
            );
          })}
          <div className="border-t border-border" />
          <button
            className="w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2.5"
            onClick={() => {
              setShowMenu(false);
              toggleChat();
            }}
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Open AI Chat</span>
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        className={cn(
          "w-12 h-12 rounded-full shadow-lg",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95",
          hasPageActions
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        title={hasPageActions ? "AI Actions" : "Open AI Chat"}
      >
        {loadingAction ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
