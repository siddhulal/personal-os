"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, RotateCcw, Save, Clock, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  fetchVersions,
  fetchVersion,
  createVersion,
  restoreVersion,
} from "@/lib/api/versions";
import type { NoteVersion } from "@/types";

interface NoteVersionHistoryProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteVersionHistory({
  noteId,
  open,
  onOpenChange,
}: NoteVersionHistoryProps) {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: versions = [], isLoading } = useQuery<NoteVersion[]>({
    queryKey: ["note-versions", noteId],
    queryFn: () => fetchVersions(noteId),
    enabled: open && !!noteId,
  });

  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  );

  const createSnapshotMutation = useMutation({
    mutationFn: () => createVersion(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-versions", noteId] });
      toast.success("Snapshot created");
    },
    onError: () => toast.error("Failed to create snapshot"),
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreVersion(noteId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-versions", noteId] });
      queryClient.invalidateQueries({ queryKey: ["page", noteId] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setSelectedVersion(null);
      toast.success("Version restored successfully");
    },
    onError: () => toast.error("Failed to restore version"),
  });

  async function handleSelectVersion(version: NoteVersion) {
    if (selectedVersion?.id === version.id) {
      setSelectedVersion(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const full = await fetchVersion(noteId, version.id);
      setSelectedVersion(full);
    } catch {
      toast.error("Failed to load version");
    } finally {
      setPreviewLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function hasTitleChanged(version: NoteVersion, index: number): boolean {
    const olderVersion = sortedVersions[index + 1];
    if (!olderVersion) return false;
    return version.title !== olderVersion.title;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {versions.length} version{versions.length !== 1 ? "s" : ""} saved
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => createSnapshotMutation.mutate()}
            disabled={createSnapshotMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {createSnapshotMutation.isPending ? "Saving..." : "Create Snapshot"}
          </Button>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Loading versions...
            </div>
          ) : sortedVersions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No versions saved yet.</p>
              <p className="text-xs mt-1">
                Create a snapshot to save the current state of this note.
              </p>
            </div>
          ) : (
            sortedVersions.map((version, index) => (
              <div key={version.id}>
                <button
                  onClick={() => handleSelectVersion(version)}
                  className={`w-full text-left rounded-md px-3 py-2.5 transition-colors hover:bg-accent ${
                    selectedVersion?.id === version.id
                      ? "bg-accent border border-border"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          selectedVersion?.id === version.id ? "rotate-90" : ""
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            v{version.versionNumber}
                          </span>
                          <span className="text-sm truncate text-muted-foreground">
                            {version.title}
                          </span>
                          {hasTitleChanged(version, index) && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Title changed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {selectedVersion?.id === version.id && (
                  <div className="ml-6 mt-2 mb-3 rounded-md border bg-muted/30 p-4 space-y-3">
                    {previewLoading ? (
                      <p className="text-sm text-muted-foreground">Loading preview...</p>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Title
                          </p>
                          <p className="text-sm font-medium">{selectedVersion.title}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Content
                          </p>
                          <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {selectedVersion.content || (
                              <span className="text-muted-foreground italic">No text content</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreMutation.mutate(version.id)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {restoreMutation.isPending ? "Restoring..." : "Restore this version"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
