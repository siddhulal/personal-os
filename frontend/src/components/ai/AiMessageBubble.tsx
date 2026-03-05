"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { User, Bot, Copy, Check, BookmarkPlus } from "lucide-react";
import { MermaidDiagram } from "./MermaidDiagram";
import { Button } from "@/components/ui/button";

interface AiMessageBubbleProps {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  isStreaming?: boolean;
  onSaveAsQuestion?: (content: string) => void;
}

export function AiMessageBubble({ role, content, isStreaming, onSaveAsQuestion }: AiMessageBubbleProps) {
  const isUser = role === "USER";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-2 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className="max-w-[85%] space-y-1">
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:rounded [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-mermaid/.exec(className || "");
                    if (match) {
                      return <MermaidDiagram chart={String(children).trim()} />;
                    }
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-background/50 px-1 rounded text-xs" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>
        {/* Action buttons for assistant messages */}
        {!isUser && !isStreaming && content && (
          <div className="flex items-center gap-1 pl-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
            {onSaveAsQuestion && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onSaveAsQuestion(content)}
              >
                <BookmarkPlus className="w-3 h-3 mr-1" />
                Save as Question
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
