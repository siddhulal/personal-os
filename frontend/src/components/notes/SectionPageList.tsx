"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2, MoveRight, MoreHorizontal, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Note, Notebook } from "@/types";
import { createPage, deletePage, updatePage, fetchNotebooks } from "@/lib/api/notebooks";

interface SectionPageListProps {
  pages: Note[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  sectionId: string | null;
  notebookId: string | null;
  onCollapse?: () => void;
}

export function SectionPageList({
  pages,
  selectedPageId,
  onSelectPage,
  sectionId,
  notebookId,
  onCollapse,
}: SectionPageListProps) {
  const queryClient = useQueryClient();
  const [confirmDeletePage, setConfirmDeletePage] = useState<Note | null>(null);
  const [movePageDialogOpen, setMovePageDialogOpen] = useState(false);
  const [pageToMove, setPageToMove] = useState<Note | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>("");

  // Drag & drop state
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const { data: allNotebooks = [] } = useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: fetchNotebooks,
  });

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

  const movePageMutation = useMutation({
    mutationFn: ({ pageId, newSectionId }: { pageId: string; newSectionId: string }) => {
      const page = pages.find(p => p.id === pageId);
      const targetNotebook = allNotebooks.find(nb => nb.sections.some(s => s.id === newSectionId));
      return updatePage(pageId, {
        title: page?.title ?? "Untitled",
        notebookId: targetNotebook?.id,
        sectionId: newSectionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Page moved");
      setMovePageDialogOpen(false);
      setPageToMove(null);
    },
    onError: () => toast.error("Failed to move page"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedPages: { id: string; title: string; orderIndex: number }[]) => {
      await Promise.all(
        orderedPages.map(({ id, title, orderIndex }) =>
          updatePage(id, { title, orderIndex })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages", sectionId] });
    },
    onError: () => toast.error("Failed to reorder"),
  });

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getPreview(page: Note): string {
    const text = page.content || "";
    if (!text) return "";
    return text.slice(0, 120).replace(/\s+/g, " ").trim();
  }

  function getWordCount(page: Note): number {
    const text = page.content || "";
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function openMoveDialog(page: Note) {
    setPageToMove(page);
    setTargetSectionId("");
    setMovePageDialogOpen(true);
  }

  // --- Drag handlers ---
  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = "move";
    const page = pages.find(p => p.id === pageId);
    e.dataTransfer.setData("text/plain", pageId);
    e.dataTransfer.setData("application/x-note-page", pageId);
    e.dataTransfer.setData("application/x-note-title", page?.title || "Untitled");
    // Make the drag image slightly transparent
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.5";
    setTimeout(() => { el.style.opacity = "1"; }, 0);
  }, [pages]);

  const handleDragEnd = useCallback(() => {
    setDraggedPageId(null);
    setDropTargetIdx(null);
    dragCounter.current = 0;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Determine if we should place above or below this item
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetPos = e.clientY < midY ? idx : idx + 1;
    setDropTargetIdx(targetPos);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("application/x-note-page");
    if (!draggedId || dropTargetIdx === null) return;

    const oldIdx = pages.findIndex(p => p.id === draggedId);
    if (oldIdx === -1) return;

    // Calculate new order
    const newPages = [...pages];
    const [moved] = newPages.splice(oldIdx, 1);
    const insertAt = dropTargetIdx > oldIdx ? dropTargetIdx - 1 : dropTargetIdx;
    newPages.splice(insertAt, 0, moved);

    // Update order indexes
    const updates = newPages.map((p, i) => ({ id: p.id, title: p.title || "Untitled", orderIndex: i }));
    reorderMutation.mutate(updates);

    setDraggedPageId(null);
    setDropTargetIdx(null);
    dragCounter.current = 0;
  }, [pages, dropTargetIdx, reorderMutation]);

  if (!sectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Select a section to see pages</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-primary/50" />
          <h3 className="font-semibold text-sm">
            Pages
          </h3>
          {pages.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
              {pages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
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
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onCollapse}
              title="Collapse page list"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator className="mx-3" />

      <div
        className="flex-1 overflow-y-auto p-2 space-y-0.5 pt-2 notes-sidebar-scroll"
        onDragOver={(e) => {
          e.preventDefault();
          // Allow drop on empty area → drop at end
          if (pages.length === 0) setDropTargetIdx(0);
        }}
        onDrop={handleDrop}
      >
        {pages.map((page, idx) => (
          <div key={page.id} className="relative">
            {/* Drop indicator line above this item */}
            {dropTargetIdx === idx && draggedPageId && draggedPageId !== page.id && (
              <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-primary rounded-full z-10" />
            )}

            <div
              draggable
              onDragStart={(e) => handleDragStart(e, page.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              className={cn(
                "group rounded-xl transition-all duration-200 relative cursor-grab active:cursor-grabbing",
                selectedPageId === page.id
                  ? "bg-muted/80 border border-border/60 shadow-sm"
                  : "hover:bg-accent/40 border border-transparent",
                draggedPageId === page.id && "opacity-40",
              )}
            >
              {/* Active accent bar */}
              {selectedPageId === page.id && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-primary rounded-r" />
              )}

              <button
                className="flex-1 w-full text-left p-3 min-w-0"
                onClick={() => onSelectPage(page.id)}
              >
                <p className={cn(
                  "text-[13px] font-semibold truncate leading-snug",
                  selectedPageId === page.id ? "text-foreground" : "text-foreground/90"
                )}>
                  {page.title || "Untitled"}
                </p>
                {getPreview(page) && (
                  <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
                    {getPreview(page)}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground/40 font-medium">
                  <span>{formatDate(page.updatedAt)}</span>
                  <span>&middot;</span>
                  <span>{getWordCount(page)} words</span>
                  {page.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0 rounded text-[10px] font-medium"
                      style={{ background: `${tag.color}10`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </button>

              {/* Context menu */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openMoveDialog(page)}>
                      <MoveRight className="h-3.5 w-3.5 mr-2" />
                      Move to...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDeletePage(page)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Drop indicator line below the last item */}
            {dropTargetIdx === idx + 1 && idx === pages.length - 1 && draggedPageId && draggedPageId !== page.id && (
              <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-primary rounded-full z-10" />
            )}
          </div>
        ))}

        {pages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No pages yet</p>
            <Button variant="link" size="sm" onClick={() => createPageMutation.mutate()}>
              Create one
            </Button>
          </div>
        )}
      </div>

      {/* Move Page Dialog */}
      <Dialog open={movePageDialogOpen} onOpenChange={setMovePageDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Move &quot;{pageToMove?.title || "Untitled"}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination section" />
              </SelectTrigger>
              <SelectContent>
                {allNotebooks.map((nb) =>
                  nb.sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id} disabled={sec.id === sectionId}>
                      {nb.name} / {sec.name}
                      {sec.id === sectionId ? " (current)" : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovePageDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!targetSectionId || targetSectionId === sectionId || movePageMutation.isPending}
              onClick={() => {
                if (pageToMove && targetSectionId) {
                  movePageMutation.mutate({ pageId: pageToMove.id, newSectionId: targetSectionId });
                }
              }}
            >
              {movePageMutation.isPending ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeletePage}
        onOpenChange={(open) => { if (!open) setConfirmDeletePage(null); }}
        title="Delete Page"
        description={`Are you sure you want to delete "${confirmDeletePage?.title || "Untitled"}"? This action cannot be undone.`}
        onConfirm={() => {
          if (confirmDeletePage) {
            deletePageMutation.mutate(confirmDeletePage.id);
            setConfirmDeletePage(null);
          }
        }}
        loading={deletePageMutation.isPending}
      />
    </div>
  );
}
