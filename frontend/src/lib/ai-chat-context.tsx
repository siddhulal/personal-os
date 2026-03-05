"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AiChatContextType {
  isOpen: boolean;
  isExpanded: boolean;
  toggleChat: () => void;
  openChat: (context?: string) => void;
  closeChat: () => void;
  toggleExpanded: () => void;
  currentContext: string | null;
}

const AiChatContext = createContext<AiChatContextType | undefined>(undefined);

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentContext, setCurrentContext] = useState<string | null>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openChat = useCallback((context?: string) => {
    setCurrentContext(context || null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <AiChatContext.Provider value={{ isOpen, isExpanded, toggleChat, openChat, closeChat, toggleExpanded, currentContext }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within an AiChatProvider");
  }
  return context;
}
