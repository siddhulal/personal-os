"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText } from "lucide-react";
import { fetchRelatedNotes } from "@/lib/api/notebooks";
import type { Note } from "@/types";

interface RelatedNotesPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function RelatedNotesPanel({ noteId, onNavigate }: RelatedNotesPanelProps) {
  const { data: related = [] } = useQuery<Note[]>({
    queryKey: ["related-notes", noteId],
    queryFn: () => fetchRelatedNotes(noteId),
    enabled: !!noteId,
    staleTime: 30_000,
  });

  if (related.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No related notes found. Notes with similar content will appear here.
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap gap-1">
        {related.map((note) => (
          <button
            key={note.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted/50 hover:bg-muted text-foreground transition-colors"
            onClick={() => onNavigate(note.id)}
          >
            <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate max-w-[160px]">{note.title || "Untitled"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
