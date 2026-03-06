"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { fetchTags, createTag } from "@/lib/api/tags";
import { updatePage } from "@/lib/api/notebooks";
import type { Tag, Note } from "@/types";

interface TagPanelProps {
  note: Note;
  onUpdate?: () => void;
  inline?: boolean;
}

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function TagPanel({ note, onUpdate, inline }: TagPanelProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const createTagMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => createTag(data),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      addTagToNote(newTag.id);
      setNewTagName("");
      setCreateDialogOpen(false);
      toast.success("Tag created");
    },
    onError: () => toast.error("Failed to create tag"),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ tagIds }: { tagIds: string[] }) =>
      updatePage(note.id, { title: note.title, tagIds } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page", note.id] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      onUpdate?.();
    },
    onError: () => toast.error("Failed to update tags"),
  });

  function addTagToNote(tagId: string) {
    const currentTagIds = note.tags?.map((t) => t.id) ?? [];
    if (!currentTagIds.includes(tagId)) {
      updateNoteMutation.mutate({ tagIds: [...currentTagIds, tagId] });
    }
  }

  function removeTagFromNote(tagId: string) {
    const currentTagIds = note.tags?.map((t) => t.id) ?? [];
    updateNoteMutation.mutate({ tagIds: currentTagIds.filter((id) => id !== tagId) });
  }

  const availableTags = allTags.filter(
    (t) => !note.tags?.some((nt) => nt.id === t.id)
  );

  return (
    <div className={inline ? "flex items-center gap-1.5 flex-wrap" : "px-6 py-1 flex items-center gap-1.5 flex-wrap"}>
      {!inline && <Tags className="h-3 w-3 text-muted-foreground shrink-0" />}
      {note.tags?.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs px-2 py-0 h-5 gap-1 group"
          style={{ borderLeft: `3px solid ${tag.color}` }}
        >
          {tag.name}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeTagFromNote(tag.id)}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Add tag">
            <Plus className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableTags.map((tag) => (
            <DropdownMenuItem key={tag.id} onClick={() => addTagToNote(tag.id)}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mr-2" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </DropdownMenuItem>
          ))}
          {availableTags.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => { setNewTagName(""); setNewTagColor(TAG_COLORS[0]); setCreateDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Create new tag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Tag Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagName.trim()) {
                  createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
                }
              }}
            />
            <div className="flex gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newTagColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!newTagName.trim() || createTagMutation.isPending}
              onClick={() => createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })}
            >
              {createTagMutation.isPending ? "Creating..." : "Create & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
