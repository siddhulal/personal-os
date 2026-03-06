"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  generateWeeklyReview,
  summarizeProject,
  generateFlashcardsFromNote,
  suggestTasksFromGoal,
} from "@/lib/api/ai-copilot";
import type { AiGenerateResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  X,
  Copy,
  Loader2,
  FileText,
  Target,
  Layers,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AiCopilotProps {
  context?: string;
  entityType?: string;
  entityId?: string;
}

interface CopilotAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  entityFilter?: string;
  execute: () => Promise<AiGenerateResponse>;
}

export function AiCopilot({ context, entityType, entityId }: AiCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (action: CopilotAction) => action.execute(),
    onSuccess: (data) => {
      setResult(data.content);
      toast.success("AI generation complete");
    },
    onError: () => {
      toast.error("AI generation failed. Please try again.");
      setResult(null);
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const actions: CopilotAction[] = [
    {
      id: "weekly-review",
      label: "Generate Weekly Review",
      description: "Summarize your progress across all modules this week",
      icon: BarChart3,
      execute: () => generateWeeklyReview(),
    },
    {
      id: "summarize-project",
      label: "Summarize Project",
      description: "Get an AI-generated overview of this project",
      icon: Layers,
      entityFilter: "project",
      execute: () => summarizeProject(entityId!),
    },
    {
      id: "generate-flashcards",
      label: "Generate Flashcards",
      description: "Create flashcards from this note's content",
      icon: FileText,
      entityFilter: "note",
      execute: () => generateFlashcardsFromNote(entityId!),
    },
    {
      id: "suggest-tasks",
      label: "Suggest Tasks",
      description: "Get AI-suggested tasks to achieve this goal",
      icon: Target,
      entityFilter: "goal",
      execute: () => suggestTasksFromGoal(entityId!),
    },
  ];

  const visibleActions = actions.filter(
    (action) => !action.entityFilter || action.entityFilter === entityType
  );

  const handleAction = useCallback(
    (action: CopilotAction) => {
      if (mutation.isPending) return;
      setActiveAction(action.id);
      setResult(null);
      mutation.mutate(action);
    },
    [mutation]
  );

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setResult(null);
    setActiveAction(null);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Floating trigger button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            "bg-gradient-to-br from-purple-600 to-indigo-600",
            "hover:from-purple-700 hover:to-indigo-700",
            "transition-all duration-200 hover:scale-105 active:scale-95"
          )}
          size="icon"
          title="AI Copilot"
        >
          <Brain className="h-5 w-5 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card
        className={cn(
          "w-[380px] shadow-2xl border-purple-200/50 dark:border-purple-800/50",
          "transition-all duration-300 overflow-hidden",
          isMinimized ? "h-auto" : "max-h-[520px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-sm">AI Copilot</span>
            {context && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {context}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleMinimize}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <div
                className={cn(
                  "w-3 h-0.5 bg-muted-foreground rounded-full transition-transform",
                  isMinimized && "rotate-0"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:text-destructive"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col">
            {/* Actions list */}
            <div className="p-3 space-y-1.5 border-b">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium px-1 mb-2">
                Actions
              </p>
              {visibleActions.map((action) => {
                const Icon = action.icon;
                const isActive = activeAction === action.id && mutation.isPending;

                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    disabled={mutation.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
                      "transition-colors duration-150",
                      isActive
                        ? "bg-purple-100 dark:bg-purple-900/30"
                        : "hover:bg-muted/80",
                      mutation.isPending && !isActive && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-md shrink-0",
                        "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                      )}
                    >
                      {isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{action.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
              {visibleActions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No actions available for the current context.
                </p>
              )}
            </div>

            {/* Results area */}
            {(mutation.isPending || result) && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium px-1">
                    Result
                  </p>
                  {result && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </div>

                {mutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                    <p className="text-sm text-muted-foreground">Generating...</p>
                  </div>
                ) : result ? (
                  <div className="max-h-[220px] overflow-y-auto rounded-lg bg-muted/50 p-3">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {result}
                    </pre>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
