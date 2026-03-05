"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface AiResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  isLoading?: boolean;
  onCancel?: () => void;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  }[];
}

export function AiResultDialog({
  open,
  onOpenChange,
  title,
  content,
  isLoading,
  onCancel,
  actions,
}: AiResultDialogProps) {
  const [copied, setCopied] = useState(false);
  const hasDiagram = content.includes("```mermaid");

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${hasDiagram ? "max-w-5xl" : "max-w-2xl"} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-muted-foreground">Generating with AI...</span>
            </div>
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-xs">
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
                      <code className="bg-muted px-1 rounded text-xs" {...props}>
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
            </div>
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {actions?.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant || "default"}
                  size="sm"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
