"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-6">
        <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
        <p className="text-sm text-muted-foreground break-words">
          {error.message}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
