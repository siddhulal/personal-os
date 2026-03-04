"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Book,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Notebook, Section } from "@/types";
import { createNotebook, deleteNotebook, createSection, deleteSection } from "@/lib/api/notebooks";

interface NotebookSidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  selectedSectionId: string | null;
  onSelectSection: (notebookId: string, sectionId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenDailyNote?: () => void;
}

export function NotebookSidebar({
  notebooks,
  selectedNotebookId,
  selectedSectionId,
  onSelectSection,
  searchQuery,
  onSearchChange,
  onOpenDailyNote,
}: NotebookSidebarProps) {
  const queryClient = useQueryClient();
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(
    new Set(notebooks.map((n) => n.id))
  );

  // Auto-expand newly added notebooks
  useEffect(() => {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      notebooks.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notebooks]);
  const [createNotebookOpen, setCreateNotebookOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [sectionNotebookId, setSectionNotebookId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");

  const createNotebookMutation = useMutation({
    mutationFn: (name: string) => createNotebook({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook created");
      setCreateNotebookOpen(false);
      setNewNotebookName("");
    },
    onError: () => toast.error("Failed to create notebook"),
  });

  const deleteNotebookMutation = useMutation({
    mutationFn: deleteNotebook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook deleted");
    },
    onError: () => toast.error("Failed to delete notebook"),
  });

  const createSectionMutation = useMutation({
    mutationFn: ({ notebookId, name }: { notebookId: string; name: string }) =>
      createSection(notebookId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Section created");
      setCreateSectionOpen(false);
      setNewSectionName("");
      setSectionNotebookId(null);
    },
    onError: () => toast.error("Failed to create section"),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Section deleted");
    },
    onError: () => toast.error("Failed to delete section"),
  });

  function toggleNotebook(id: string) {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddSection(notebookId: string) {
    setSectionNotebookId(notebookId);
    setNewSectionName("");
    setCreateSectionOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Notebooks
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCreateNotebookOpen(true)}
            title="New Notebook"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {onOpenDailyNote && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={onOpenDailyNote}
          >
            <CalendarDays className="h-4 w-4" />
            Today&apos;s Note
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {notebooks.map((notebook) => (
          <div key={notebook.id} className="mb-1">
            <div className="flex items-center group">
              <button
                className="flex items-center gap-1.5 flex-1 text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted/50 transition-colors"
                onClick={() => toggleNotebook(notebook.id)}
              >
                {expandedNotebooks.has(notebook.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <Book
                  className="h-4 w-4 shrink-0"
                  style={{ color: notebook.color }}
                />
                <span className="truncate font-medium">{notebook.name}</span>
              </button>
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 mr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleAddSection(notebook.id)}
                  title="Add Section"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => deleteNotebookMutation.mutate(notebook.id)}
                  title="Delete Notebook"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {expandedNotebooks.has(notebook.id) && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {notebook.sections.map((section: Section) => (
                  <div key={section.id} className="flex items-center group/section">
                    <button
                      className={cn(
                        "flex items-center gap-1.5 flex-1 text-left px-2 py-1 text-sm rounded-md transition-colors",
                        selectedSectionId === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50 text-muted-foreground"
                      )}
                      onClick={() => onSelectSection(notebook.id, section.id)}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{section.name}</span>
                      <span className="ml-auto text-xs opacity-60">
                        {section.pageCount}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/section:opacity-100 text-destructive hover:text-destructive mr-1"
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                      title="Delete Section"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {notebooks.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Book className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No notebooks yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setCreateNotebookOpen(true)}
            >
              Create one
            </Button>
          </div>
        )}
      </div>

      {/* Create Notebook Dialog */}
      <Dialog open={createNotebookOpen} onOpenChange={setCreateNotebookOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Notebook</DialogTitle>
            <DialogDescription>Create a new notebook to organize your notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="notebook-name">Name</Label>
              <Input
                id="notebook-name"
                placeholder="My Notebook"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNotebookName.trim()) {
                    createNotebookMutation.mutate(newNotebookName.trim());
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateNotebookOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createNotebookMutation.mutate(newNotebookName.trim())}
              disabled={!newNotebookName.trim() || createNotebookMutation.isPending}
            >
              {createNotebookMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Section Dialog */}
      <Dialog open={createSectionOpen} onOpenChange={setCreateSectionOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Section</DialogTitle>
            <DialogDescription>Add a new section to organize pages.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="section-name">Name</Label>
              <Input
                id="section-name"
                placeholder="Section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSectionName.trim() && sectionNotebookId) {
                    createSectionMutation.mutate({
                      notebookId: sectionNotebookId,
                      name: newSectionName.trim(),
                    });
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sectionNotebookId) {
                  createSectionMutation.mutate({
                    notebookId: sectionNotebookId,
                    name: newSectionName.trim(),
                  });
                }
              }}
              disabled={!newSectionName.trim() || createSectionMutation.isPending}
            >
              {createSectionMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
