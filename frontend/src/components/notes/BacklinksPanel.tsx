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
    <div className="px-6 pb-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider mr-0.5">
          Linked from
        </span>
        {backlinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.sourceNoteId)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/8 text-primary/80 hover:bg-primary/15 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-2.5 w-2.5" />
            {link.sourceNoteTitle}
          </button>
        ))}
      </div>
    </div>
  );
}
