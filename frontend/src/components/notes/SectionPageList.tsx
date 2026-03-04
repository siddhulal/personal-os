"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";
import { createPage, deletePage } from "@/lib/api/notebooks";

interface SectionPageListProps {
  pages: Note[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  sectionId: string | null;
  notebookId: string | null;
}

export function SectionPageList({
  pages,
  selectedPageId,
  onSelectPage,
  sectionId,
  notebookId,
}: SectionPageListProps) {
  const queryClient = useQueryClient();

  const createPageMutation = useMutation({
    mutationFn: () =>
      createPage({
        title: "Untitled",
        content: "",
        notebookId: notebookId ?? undefined,
        sectionId: sectionId ?? undefined,
      }),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["pages", sectionId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      onSelectPage(newPage.id);
      toast.success("Page created");
    },
    onError: () => toast.error("Failed to create page"),
  });

  const deletePageMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages", sectionId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Page deleted");
    },
    onError: () => toast.error("Failed to delete page"),
  });

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (!sectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Select a section to see pages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex items-center justify-between border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Pages
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => createPageMutation.mutate()}
          disabled={createPageMutation.isPending}
          title="New Page"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {pages.map((page) => (
          <div
            key={page.id}
            className={cn(
              "flex items-center group rounded-md transition-colors cursor-pointer",
              selectedPageId === page.id
                ? "bg-primary/10"
                : "hover:bg-muted/50"
            )}
          >
            <button
              className="flex-1 text-left px-3 py-2 min-w-0"
              onClick={() => onSelectPage(page.id)}
            >
              <p
                className={cn(
                  "text-sm truncate",
                  selectedPageId === page.id
                    ? "text-primary font-medium"
                    : "text-foreground"
                )}
              >
                {page.title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(page.updatedAt)}
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive mr-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                deletePageMutation.mutate(page.id);
              }}
              title="Delete Page"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {pages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No pages yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => createPageMutation.mutate()}
            >
              Create one
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
