"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, ReactNode } from "react";
import { AuthProvider } from "./auth";
import { AiChatProvider } from "./ai-chat-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <AiChatProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </AiChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
