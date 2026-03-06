"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Quote,
  Minus,
  Info,
  Lightbulb,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  PenLine,
  BookOpen,
  FileText,
  ListCollapse,
  Activity,
  Image as ImageIcon,
} from "lucide-react";
import type { CalloutType } from "./CalloutExtension";

interface SlashCommandItem {
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: (editor: Editor) => void;
  aiAction?: string;
}

const iconClass = "h-4 w-4";

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    label: "Paragraph",
    description: "Plain text block",
    icon: <Type className={iconClass} />,
    category: "Text",
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    label: "Heading 1",
    description: "Large heading",
    icon: <Heading1 className={iconClass} />,
    category: "Text",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    description: "Medium heading",
    icon: <Heading2 className={iconClass} />,
    category: "Text",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    description: "Small heading",
    icon: <Heading3 className={iconClass} />,
    category: "Text",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bullet List",
    description: "Unordered list",
    icon: <List className={iconClass} />,
    category: "Lists",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered List",
    description: "Ordered list",
    icon: <ListOrdered className={iconClass} />,
    category: "Lists",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Task List",
    description: "Checklist with checkboxes",
    icon: <ListChecks className={iconClass} />,
    category: "Lists",
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Code Block",
    description: "Syntax-highlighted code",
    icon: <Code className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "Quote",
    description: "Blockquote",
    icon: <Quote className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Divider",
    description: "Horizontal rule",
    icon: <Minus className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "Callout Info",
    description: "Blue info box",
    icon: <Info className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().setCallout({ type: "info" as CalloutType }).run(),
  },
  {
    label: "Callout Tip",
    description: "Green tip box",
    icon: <Lightbulb className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().setCallout({ type: "tip" as CalloutType }).run(),
  },
  {
    label: "Callout Warning",
    description: "Yellow warning box",
    icon: <AlertTriangle className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().setCallout({ type: "warning" as CalloutType }).run(),
  },
  {
    label: "Callout Danger",
    description: "Red danger box",
    icon: <ShieldAlert className={iconClass} />,
    category: "Blocks",
    action: (editor) => editor.chain().focus().setCallout({ type: "danger" as CalloutType }).run(),
  },
  {
    label: "AI Continue Writing",
    description: "Continue from where you left off",
    icon: <PenLine className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "continue",
  },
  {
    label: "AI Generate Example",
    description: "Generate code examples",
    icon: <Sparkles className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "generate_example",
  },
  {
    label: "AI Explain",
    description: "Explain in simple terms",
    icon: <BookOpen className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "explain",
  },
  {
    label: "AI Add Details",
    description: "Add depth and details",
    icon: <FileText className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "add_details",
  },
  {
    label: "AI Summarize",
    description: "Summarize the content",
    icon: <ListCollapse className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "summarize",
  },
  {
    label: "AI Generate Diagram",
    description: "Create a Mermaid diagram",
    icon: <Activity className={`${iconClass} text-purple-500`} />,
    category: "AI",
    action: () => {},
    aiAction: "generate_diagram",
  },
  {
    label: "Image",
    description: "Insert an image",
    icon: <ImageIcon className={iconClass} />,
    category: "Blocks",
    action: (editor) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          const formData = new FormData();
          formData.append("file", file);
          try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8080` : 'http://localhost:8080');
            const response = await fetch(`${apiBaseUrl}/api/upload`, {
              method: "POST",
              body: formData,
              headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
              }
            });
            const data = await response.json();
            if (data.url) {
              const url = apiBaseUrl + data.url;
              editor.chain().focus().setImage({ src: url }).run();
            }
          } catch (error) {
            console.error("Image upload failed", error);
          }
        }
      };
      input.click();
    },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  onAiAction?: (action: string, textAboveCursor: string, fullNoteText: string) => void;
}

export function SlashCommandMenu({ editor, onAiAction }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const slashPosRef = useRef<number>(0);

  const filtered = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const executeCommand = useCallback(
    (item: SlashCommandItem) => {
      // Delete the "/" and query text
      const { state } = editor;
      const from = slashPosRef.current;
      const to = state.selection.from;

      if (item.aiAction && onAiAction) {
        // Extract text above cursor and full note text before deleting slash
        const textAboveCursor = state.doc.textBetween(0, from, "\n");
        const fullNoteText = editor.getText();
        editor.chain().focus().deleteRange({ from, to }).run();
        onAiAction(item.aiAction, textAboveCursor, fullNoteText);
      } else {
        editor.chain().focus().deleteRange({ from, to }).run();
        item.action(editor);
      }

      setIsOpen(false);
      setQuery("");
    },
    [editor, onAiAction]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && filtered.length > 0) {
        event.preventDefault();
        executeCommand(filtered[selectedIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, filtered, selectedIndex, executeCommand]);

  // Detect "/" at start of line
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;

      // Get the current node (paragraph) and position within it
      const $pos = state.doc.resolve(from);
      const textInBlock = $pos.parent.textBetween(0, $pos.parentOffset, "\n");

      // Match "/" at start of the block or after whitespace
      const match = textInBlock.match(/(?:^|\s)\/([\w\s]{0,30})$/);

      if (match) {
        const searchQuery = match[1] || "";
        // Calculate slash position: how far back from cursor
        const matchedLen = match[0].length; // includes the optional space + "/" + query
        slashPosRef.current = from - searchQuery.length - 1; // -1 for the "/"
        setQuery(searchQuery);
        setSelectedIndex(0);
        setIsOpen(true);

        // Position the dropdown relative to editor
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        
        // Calculate available space below
        const spaceBelow = window.innerHeight - coords.bottom;
        const menuHeight = 320; // max-h-80 is 320px
        
        let top = coords.bottom - editorRect.top + 4;
        
        // If not enough space below, show it above the cursor
        if (spaceBelow < menuHeight && coords.top > menuHeight) {
          top = coords.top - editorRect.top - menuHeight - 4;
        }

        setPosition({
          top,
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
  }, [editor, isOpen]);

  if (!isOpen || filtered.length === 0) return null;

  // Group by category
  const grouped: Record<string, SlashCommandItem[]> = {};
  let globalIdx = 0;
  const indexMap: number[] = [];
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
    indexMap.push(globalIdx);
    globalIdx++;
  }

  let runningIdx = 0;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-1">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
              category === "AI" ? "text-purple-500" : "text-muted-foreground"
            }`}>
              {category}
            </div>
            {items.map((item) => {
              const idx = runningIdx++;
              return (
                <button
                  key={item.label}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-3 ${
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="text-muted-foreground shrink-0">{item.icon}</span>
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
