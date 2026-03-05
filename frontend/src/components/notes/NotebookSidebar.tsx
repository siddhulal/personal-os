"use client";

import { useState, useEffect, useCallback } from "react";
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
  Pencil,
  Check,
  X,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Notebook, Section } from "@/types";
import { createNotebook, deleteNotebook, updateNotebook, createSection, deleteSection, updateSection, updatePage } from "@/lib/api/notebooks";

interface NotebookSidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  selectedSectionId: string | null;
  onSelectSection: (notebookId: string, sectionId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenDailyNote?: () => void;
  onCollapse?: () => void;
}

export function NotebookSidebar({
  notebooks,
  selectedNotebookId,
  selectedSectionId,
  onSelectSection,
  searchQuery,
  onSearchChange,
  onOpenDailyNote,
  onCollapse,
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
  const [confirmDeleteNotebook, setConfirmDeleteNotebook] = useState<Notebook | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<Section | null>(null);
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);
  const [renamingNotebookName, setRenamingNotebookName] = useState("");
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingSectionName, setRenamingSectionName] = useState("");
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);

  const movePageToSectionMutation = useMutation({
    mutationFn: ({ pageId, pageTitle, targetNotebookId, targetSectionId: secId }: { pageId: string; pageTitle: string; targetNotebookId: string; targetSectionId: string }) =>
      updatePage(pageId, { title: pageTitle, notebookId: targetNotebookId, sectionId: secId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Page moved");
    },
    onError: () => toast.error("Failed to move page"),
  });

  const handleSectionDragOver = useCallback((e: React.DragEvent, secId: string) => {
    if (!e.dataTransfer.types.includes("application/x-note-page")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetSectionId(secId);
  }, []);

  const handleSectionDragLeave = useCallback(() => {
    setDropTargetSectionId(null);
  }, []);

  const handleSectionDrop = useCallback((e: React.DragEvent, nbId: string, secId: string) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("application/x-note-page");
    const pageTitle = e.dataTransfer.getData("application/x-note-title") || "Untitled";
    if (!pageId) return;
    setDropTargetSectionId(null);
    if (secId === selectedSectionId) return; // Already in this section
    movePageToSectionMutation.mutate({ pageId, pageTitle, targetNotebookId: nbId, targetSectionId: secId });
  }, [selectedSectionId, movePageToSectionMutation]);

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

  const renameNotebookMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateNotebook(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Notebook renamed");
      setRenamingNotebookId(null);
    },
    onError: () => toast.error("Failed to rename notebook"),
  });

  const renameSectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateSection(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Section renamed");
      setRenamingSectionId(null);
    },
    onError: () => toast.error("Failed to rename section"),
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
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-primary/70" />
            <h2 className="font-semibold text-sm">
              Notebooks
            </h2>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCreateNotebookOpen(true)}
              title="New Notebook"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {onCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onCollapse}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm bg-muted/50 border-transparent focus:border-border transition-all duration-150"
          />
        </div>
        {onOpenDailyNote && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-sm border-dashed border-primary/40 hover:border-primary/60 hover:bg-primary/5 transition-all duration-150"
            onClick={onOpenDailyNote}
          >
            <CalendarDays className="h-4 w-4 text-primary/70" />
            Today&apos;s Note
          </Button>
        )}
      </div>

      <Separator className="mx-3" />

      <div className="flex-1 overflow-y-auto px-2 pb-2 pt-2 notes-sidebar-scroll">
        {notebooks.map((notebook) => (
          <div key={notebook.id} className="mb-1">
            <div className="flex items-center group">
              {renamingNotebookId === notebook.id ? (
                <div className="flex items-center gap-1 flex-1 px-2 py-0.5">
                  <Input
                    value={renamingNotebookName}
                    onChange={(e) => setRenamingNotebookName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renamingNotebookName.trim()) {
                        renameNotebookMutation.mutate({ id: notebook.id, name: renamingNotebookName.trim() });
                      } else if (e.key === "Escape") {
                        setRenamingNotebookId(null);
                      }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    if (renamingNotebookName.trim()) renameNotebookMutation.mutate({ id: notebook.id, name: renamingNotebookName.trim() });
                  }}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRenamingNotebookId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    className="flex items-center gap-1.5 flex-1 text-left px-2 py-1.5 text-sm rounded-lg hover:bg-accent/50 transition-all duration-150"
                    onClick={() => toggleNotebook(notebook.id)}
                  >
                    {expandedNotebooks.has(notebook.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <Book className="h-4 w-4 shrink-0" style={{ color: notebook.color }} />
                    <span className="truncate font-medium">{notebook.name}</span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 mr-1 transition-opacity duration-150">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenamingNotebookId(notebook.id); setRenamingNotebookName(notebook.name); }} title="Rename">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddSection(notebook.id)} title="Add Section">
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteNotebook(notebook)} title="Delete Notebook">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {expandedNotebooks.has(notebook.id) && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {notebook.sections.map((section: Section) => (
                  <div key={section.id} className="flex items-center group/section">
                    {renamingSectionId === section.id ? (
                      <div className="flex items-center gap-1 flex-1 px-1 py-0.5">
                        <Input
                          value={renamingSectionName}
                          onChange={(e) => setRenamingSectionName(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renamingSectionName.trim()) {
                              renameSectionMutation.mutate({ id: section.id, name: renamingSectionName.trim() });
                            } else if (e.key === "Escape") {
                              setRenamingSectionId(null);
                            }
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                          if (renamingSectionName.trim()) renameSectionMutation.mutate({ id: section.id, name: renamingSectionName.trim() });
                        }}>
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          className={cn(
                            "flex items-center gap-1.5 flex-1 text-left px-2 py-1 text-sm rounded-lg transition-all duration-150",
                            selectedSectionId === section.id
                              ? "bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/20"
                              : "hover:bg-accent/50 text-muted-foreground",
                            dropTargetSectionId === section.id && "ring-2 ring-primary bg-primary/10"
                          )}
                          onClick={() => onSelectSection(notebook.id, section.id)}
                          onDoubleClick={() => { setRenamingSectionId(section.id); setRenamingSectionName(section.name); }}
                          onDragOver={(e) => handleSectionDragOver(e, section.id)}
                          onDragLeave={handleSectionDragLeave}
                          onDrop={(e) => handleSectionDrop(e, notebook.id, section.id)}
                        >
                          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{section.name}</span>
                          <span className="ml-auto text-xs opacity-60">{section.pageCount}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover/section:opacity-100 text-destructive hover:text-destructive mr-1 transition-opacity duration-150"
                          onClick={() => setConfirmDeleteSection(section)}
                          title="Delete Section"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
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

      {/* Confirm Delete Notebook */}
      <ConfirmDialog
        open={!!confirmDeleteNotebook}
        onOpenChange={(open) => { if (!open) setConfirmDeleteNotebook(null); }}
        title="Delete Notebook"
        description={`Are you sure you want to delete "${confirmDeleteNotebook?.name}"? All sections and pages inside will also be deleted. This action cannot be undone.`}
        onConfirm={() => {
          if (confirmDeleteNotebook) {
            deleteNotebookMutation.mutate(confirmDeleteNotebook.id);
            setConfirmDeleteNotebook(null);
          }
        }}
        loading={deleteNotebookMutation.isPending}
      />

      {/* Confirm Delete Section */}
      <ConfirmDialog
        open={!!confirmDeleteSection}
        onOpenChange={(open) => { if (!open) setConfirmDeleteSection(null); }}
        title="Delete Section"
        description={`Are you sure you want to delete "${confirmDeleteSection?.name}"? All pages inside will also be deleted. This action cannot be undone.`}
        onConfirm={() => {
          if (confirmDeleteSection) {
            deleteSectionMutation.mutate(confirmDeleteSection.id);
            setConfirmDeleteSection(null);
          }
        }}
        loading={deleteSectionMutation.isPending}
      />
    </div>
  );
}
