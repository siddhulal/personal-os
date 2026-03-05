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

  if (backlinks.length === 0) return null;

  return (
    <div className="border-t bg-card/50 px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Backlinks ({backlinks.length})
        </h4>
      </div>
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
