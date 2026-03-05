"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2 } from "lucide-react";
import { fetchBacklinks } from "@/lib/api/notebooks";
import type { NoteLink } from "@/types";

interface BacklinksPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function BacklinksPanel({ noteId, onNavigate }: BacklinksPanelProps) {
  const { data: backlinks = [] } = useQuery<NoteLink[]>({
    queryKey: ["backlinks", noteId],
    queryFn: () => fetchBacklinks(noteId),
    enabled: !!noteId,
  });

  if (backlinks.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No backlinks yet. Other notes that link to this one will appear here.
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap gap-1.5">
        {backlinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.sourceNoteId)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Link2 className="h-3 w-3" />
            {link.sourceNoteTitle}
          </button>
        ))}
      </div>
    </div>
  );
}
