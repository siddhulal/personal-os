"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchNotes } from "@/lib/api/notebooks";
import type { Note } from "@/types";
import {
  Search,
  FileText,
  Plus,
  Calendar,
  Sun,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (noteId: string) => void;
  onNewNote?: () => void;
  onDailyNote?: () => void;
  onToggleTheme?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectNote,
  onNewNote,
  onDailyNote,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const quickActions: QuickAction[] = [
    ...(onNewNote
      ? [{ id: "new-note", label: "New Note", icon: <Plus className="h-4 w-4" />, action: onNewNote }]
      : []),
    ...(onDailyNote
      ? [{ id: "daily-note", label: "Daily Note", icon: <Calendar className="h-4 w-4" />, action: onDailyNote }]
      : []),
    ...(onToggleTheme
      ? [{ id: "toggle-theme", label: "Toggle Theme", icon: <Sun className="h-4 w-4" />, action: onToggleTheme }]
      : []),
  ];

  const showQuickActions = query.length === 0;
  const totalItems = showQuickActions ? quickActions.length : results.length;

  // Search notes
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchNotes(q);
      setResults(data);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && totalItems > 0) {
      e.preventDefault();
      if (showQuickActions) {
        quickActions[selectedIndex]?.action();
      } else {
        const note = results[selectedIndex];
        if (note) onSelectNote(note.id);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes or type a command..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1">
          {showQuickActions && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </div>
              {quickActions.map((action, idx) => (
                <button
                  key={action.id}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-3 ${
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    action.action();
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </>
          )}

          {!showQuickActions && loading && (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              Searching...
            </div>
          )}

          {!showQuickActions && !loading && results.length === 0 && query.length >= 2 && (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              No notes found
            </div>
          )}

          {!showQuickActions && !loading && results.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </div>
              {results.map((note, idx) => (
                <button
                  key={note.id}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-3 ${
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    onSelectNote(note.id);
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{note.title}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">&uarr;&darr;</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">&crarr;</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
