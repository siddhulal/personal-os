"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAutoLinkSuggestions, createNoteLink } from "@/lib/api/notebooks";
import type { NoteSuggestion } from "@/types";
import { useState } from "react";

interface AutoLinkSuggestionsProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function AutoLinkSuggestions({ noteId, onNavigate }: AutoLinkSuggestionsProps) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: suggestions = [] } = useQuery<NoteSuggestion[]>({
    queryKey: ["auto-link-suggestions", noteId],
    queryFn: () => fetchAutoLinkSuggestions(noteId),
    enabled: !!noteId,
    staleTime: 30_000,
  });

  const linkMutation = useMutation({
    mutationFn: (targetId: string) => createNoteLink(noteId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlinks"] });
      queryClient.invalidateQueries({ queryKey: ["auto-link-suggestions", noteId] });
      queryClient.invalidateQueries({ queryKey: ["note-graph"] });
      toast.success("Link created");
    },
    onError: () => toast.error("Failed to create link"),
  });

  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  if (visible.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No link suggestions. Mentions of other notes will be detected automatically.
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="space-y-1">
        {visible.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-primary/5 group"
          >
            <button
              className="flex-1 text-left text-foreground hover:text-primary truncate transition-colors"
              onClick={() => onNavigate(s.id)}
            >
              {s.title}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={() => linkMutation.mutate(s.id)}
              disabled={linkMutation.isPending}
              title="Create link"
            >
              <Check className="h-3 w-3 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={() => setDismissed((prev) => new Set(prev).add(s.id))}
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
