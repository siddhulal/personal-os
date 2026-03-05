"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { useAiChat } from "@/lib/ai-chat-context";
import { AiChatSidebar } from "@/components/ai/AiChatSidebar";
import { AiChatToggleButton } from "@/components/ai/AiChatToggleButton";

interface AppShellProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

function AppShellInner({ children, noPadding }: AppShellProps) {
  const { user, isLoading } = useAuth();
  const { collapsed } = useSidebar();
  const { isOpen: aiChatOpen, isExpanded: aiChatExpanded } = useAiChat();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className="transition-all duration-200"
        style={{
          paddingLeft: collapsed ? "4rem" : "16rem",
          paddingRight: aiChatOpen ? (aiChatExpanded ? "40rem" : "24rem") : "0",
        }}
      >
        {noPadding ? (
          children
        ) : (
          <div className="px-4 py-4 md:px-6 md:py-5">
            {children}
          </div>
        )}
      </main>
      <AiChatSidebar />
      <AiChatToggleButton />
    </div>
  );
}

export function AppShell({ children, noPadding }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner noPadding={noPadding}>
        {children}
      </AppShellInner>
    </SidebarProvider>
  );
}
