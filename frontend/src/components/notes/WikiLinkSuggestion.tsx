"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { suggestNotes } from "@/lib/api/notebooks";
import type { NoteSuggestion } from "@/types";

interface WikiLinkSuggestionProps {
  editor: Editor;
}

export function WikiLinkSuggestion({ editor }: WikiLinkSuggestionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number>(0);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await suggestNotes(q);
      setSuggestions(results);
      setSelectedIndex(0);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && suggestions.length > 0) {
        event.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, suggestions, selectedIndex]);

  const selectSuggestion = useCallback(
    (suggestion: NoteSuggestion) => {
      // Delete the [[ and query text
      const { state } = editor;
      const pos = state.selection.from;
      const textBefore = state.doc.textBetween(
        Math.max(0, startPosRef.current - 2),
        pos,
        ""
      );

      // Find the [[ in the text before cursor
      const bracketIndex = textBefore.lastIndexOf("[[");
      if (bracketIndex >= 0) {
        const deleteFrom = startPosRef.current - 2 + bracketIndex;
        editor
          .chain()
          .focus()
          .deleteRange({ from: deleteFrom, to: pos })
          .setWikiLink({ noteId: suggestion.id, title: suggestion.title })
          .insertContent(" ")
          .run();
      }
      setIsOpen(false);
      setQuery("");
      setSuggestions([]);
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        ""
      );

      const match = textBefore.match(/\[\[([^\]]{0,50})$/);

      if (match) {
        const searchQuery = match[1];
        startPosRef.current = from - searchQuery.length;
        setQuery(searchQuery);
        setIsOpen(true);
        fetchSuggestions(searchQuery);

        // Position the dropdown
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        setPosition({
          top: coords.bottom - editorRect.top + 4,
          left: coords.left - editorRect.left,
        });
      } else {
        if (isOpen) setIsOpen(false);
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, isOpen, fetchSuggestions]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => selectSuggestion(suggestion)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    </div>
  );
}
