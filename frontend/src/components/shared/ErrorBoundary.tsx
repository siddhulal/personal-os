"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px] border-2 border-dashed border-destructive/20 rounded-2xl bg-destructive/5 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {this.state.error?.message || "An unexpected error occurred in this section of the application."}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-6"
            onClick={() => this.setState({ hasError: false })}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
