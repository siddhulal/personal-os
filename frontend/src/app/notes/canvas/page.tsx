"use client";

import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Import CanvasContent with SSR disabled
const CanvasContent = dynamic(() => import("./CanvasContent"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Loading Canvas Engine...</span>
      </div>
    </div>
  ),
});

export default function CanvasPage() {
  return (
    <AppShell noPadding>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <ErrorBoundary>
          <CanvasContent />
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}
