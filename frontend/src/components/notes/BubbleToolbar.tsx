"use client";

import { useState, useRef, useEffect } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  Sparkles,
  Loader2,
  Palette,
  Highlighter,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { noteAssist } from "@/lib/api/ai";
import { AiResultDialog } from "@/components/ai/AiResultDialog";

interface BubbleToolbarProps {
  editor: Editor;
}

const AI_ACTIONS = [
  { label: "Summarize", action: "summarize" },
  { label: "Expand", action: "expand" },
  { label: "Rewrite", action: "rewrite" },
  { label: "Explain", action: "explain" },
];

const TEXT_COLORS = [
  { label: "Default", value: "", color: "currentColor" },
  { label: "Red", value: "#ef4444", color: "#ef4444" },
  { label: "Orange", value: "#f97316", color: "#f97316" },
  { label: "Amber", value: "#f59e0b", color: "#f59e0b" },
  { label: "Green", value: "#22c55e", color: "#22c55e" },
  { label: "Teal", value: "#14b8a6", color: "#14b8a6" },
  { label: "Blue", value: "#3b82f6", color: "#3b82f6" },
  { label: "Indigo", value: "#6366f1", color: "#6366f1" },
  { label: "Purple", value: "#8b5cf6", color: "#8b5cf6" },
  { label: "Pink", value: "#ec4899", color: "#ec4899" },
  { label: "Rose", value: "#f43f5e", color: "#f43f5e" },
  { label: "Gray", value: "#6b7280", color: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "", color: "transparent" },
  { label: "Yellow", value: "#fef08a", color: "#fef08a" },
  { label: "Green", value: "#bbf7d0", color: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe", color: "#bfdbfe" },
  { label: "Purple", value: "#e9d5ff", color: "#e9d5ff" },
  { label: "Pink", value: "#fce7f3", color: "#fce7f3" },
  { label: "Orange", value: "#fed7aa", color: "#fed7aa" },
  { label: "Red", value: "#fecaca", color: "#fecaca" },
  { label: "Teal", value: "#ccfbf1", color: "#ccfbf1" },
  // Dark mode friendly versions
  { label: "D-Yellow", value: "#854d0e", color: "#854d0e" },
  { label: "D-Green", value: "#166534", color: "#166534" },
  { label: "D-Blue", value: "#1e3a5f", color: "#1e3a5f" },
  { label: "D-Purple", value: "#4c1d95", color: "#4c1d95" },
];

function ColorPickerDropdown({
  colors,
  activeColor,
  onSelect,
  onClose,
}: {
  colors: { label: string; value: string; color: string }[];
  activeColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-popover border border-border rounded-lg shadow-xl z-50 p-2"
    >
      <div className="grid grid-cols-6 gap-1">
        {colors.map((c) => (
          <button
            key={c.label}
            type="button"
            className={cn(
              "w-6 h-6 rounded-md border border-border/50 transition-all hover:scale-110 hover:shadow-md",
              activeColor === c.value && "ring-2 ring-primary ring-offset-1"
            )}
            style={{
              backgroundColor: c.value || "transparent",
              backgroundImage: !c.value
                ? "linear-gradient(45deg, #ef4444 25%, transparent 25%, transparent 75%, #3b82f6 75%)"
                : undefined,
            }}
            title={c.label}
            onClick={() => {
              onSelect(c.value);
              onClose();
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [showHeadings, setShowHeadings] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultOpen, setAiResultOpen] = useState(false);
  const [aiResultContent, setAiResultContent] = useState("");
  const [aiResultTitle, setAiResultTitle] = useState("");
  const [selectedText, setSelectedText] = useState("");

  function closeAll() {
    setShowHeadings(false);
    setShowAiMenu(false);
    setShowTextColor(false);
    setShowHighlight(false);
  }

  function setLink() {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function handleAiAction(action: string) {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;

    setSelectedText(text);
    setShowAiMenu(false);
    setAiLoading(true);
    setAiResultTitle(`AI ${action.charAt(0).toUpperCase() + action.slice(1)}`);
    setAiResultContent("");
    setAiResultOpen(true);

    try {
      const fullNoteText = editor.getText();
      const result = await noteAssist(action, text, fullNoteText);
      setAiResultContent(result.content);
    } catch {
      setAiResultContent("Failed to process text. Please check your AI settings.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleReplace() {
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, aiResultContent).run();
    setAiResultOpen(false);
  }

  function handleInsertBelow() {
    const { to } = editor.state.selection;
    editor.chain().focus().insertContentAt(to, "\n\n" + aiResultContent).run();
    setAiResultOpen(false);
  }

  const currentTextColor = editor.getAttributes("textStyle").color || "";
  const currentHighlight = editor.getAttributes("highlight").color || "";

  const btnBase =
    "h-8 w-8 flex items-center justify-center rounded-md transition-colors hover:bg-accent/30";

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{
          duration: 150,
          placement: "top",
          onHide: () => closeAll(),
        }}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-popover px-1 py-1 shadow-xl"
      >
        <button
          type="button"
          className={cn(btnBase, editor.isActive("bold") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, editor.isActive("italic") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, editor.isActive("underline") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, editor.isActive("strike") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, editor.isActive("code") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnBase, editor.isActive("link") && "bg-accent")}
          onClick={setLink}
          title="Link"
        >
          <Link className="h-4 w-4" />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            className={cn(btnBase, showTextColor && "bg-accent")}
            onClick={() => {
              setShowTextColor(!showTextColor);
              setShowHighlight(false);
              setShowHeadings(false);
              setShowAiMenu(false);
            }}
            title="Text Color"
          >
            <div className="flex flex-col items-center">
              <Palette className="h-3.5 w-3.5" />
              <div
                className="h-1 w-4 rounded-full mt-0.5"
                style={{ backgroundColor: currentTextColor || "hsl(var(--foreground))" }}
              />
            </div>
          </button>
          {showTextColor && (
            <ColorPickerDropdown
              colors={TEXT_COLORS}
              activeColor={currentTextColor}
              onSelect={(color) => {
                if (color) {
                  editor.chain().focus().setColor(color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
              }}
              onClose={() => setShowTextColor(false)}
            />
          )}
        </div>

        {/* Highlight / Background Color */}
        <div className="relative">
          <button
            type="button"
            className={cn(btnBase, showHighlight && "bg-accent")}
            onClick={() => {
              setShowHighlight(!showHighlight);
              setShowTextColor(false);
              setShowHeadings(false);
              setShowAiMenu(false);
            }}
            title="Highlight Color"
          >
            <div className="flex flex-col items-center">
              <Highlighter className="h-3.5 w-3.5" />
              <div
                className="h-1 w-4 rounded-full mt-0.5"
                style={{ backgroundColor: currentHighlight || "transparent" }}
              />
            </div>
          </button>
          {showHighlight && (
            <ColorPickerDropdown
              colors={HIGHLIGHT_COLORS}
              activeColor={currentHighlight}
              onSelect={(color) => {
                if (color) {
                  editor.chain().focus().toggleHighlight({ color }).run();
                } else {
                  editor.chain().focus().unsetHighlight().run();
                }
              }}
              onClose={() => setShowHighlight(false)}
            />
          )}
        </div>

        {/* Clear formatting */}
        <button
          type="button"
          className={btnBase}
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Heading Picker */}
        <div className="relative">
          <button
            type="button"
            className={cn(
              "h-8 px-2 flex items-center gap-1 rounded-md transition-colors hover:bg-accent/30 text-xs font-medium",
              (editor.isActive("heading", { level: 1 }) ||
                editor.isActive("heading", { level: 2 }) ||
                editor.isActive("heading", { level: 3 })) &&
                "bg-accent"
            )}
            onClick={() => {
              setShowHeadings(!showHeadings);
              setShowAiMenu(false);
              setShowTextColor(false);
              setShowHighlight(false);
            }}
            title="Headings"
          >
            H
            <ChevronDown className="h-3 w-3" />
          </button>
          {showHeadings && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-10 min-w-[8rem]">
              <button
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors",
                  editor.isActive("heading", { level: 1 }) && "bg-accent"
                )}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setShowHeadings(false);
                }}
              >
                <Heading1 className="h-4 w-4" /> Heading 1
              </button>
              <button
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors",
                  editor.isActive("heading", { level: 2 }) && "bg-accent"
                )}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setShowHeadings(false);
                }}
              >
                <Heading2 className="h-4 w-4" /> Heading 2
              </button>
              <button
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors",
                  editor.isActive("heading", { level: 3 }) && "bg-accent"
                )}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setShowHeadings(false);
                }}
              >
                <Heading3 className="h-4 w-4" /> Heading 3
              </button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* AI Menu */}
        <div className="relative">
          <button
            type="button"
            className={cn(
              "h-8 px-2 flex items-center gap-1 rounded-md transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium"
            )}
            onClick={() => {
              setShowAiMenu(!showAiMenu);
              setShowHeadings(false);
              setShowTextColor(false);
              setShowHighlight(false);
            }}
            title="AI Assist"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI
            <ChevronDown className="h-3 w-3" />
          </button>
          {showAiMenu && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-10 min-w-[8rem]">
              {AI_ACTIONS.map(({ label, action }) => (
                <button
                  key={action}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => handleAiAction(action)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </BubbleMenu>

      {/* AI Result Dialog */}
      <AiResultDialog
        open={aiResultOpen}
        onOpenChange={setAiResultOpen}
        title={aiResultTitle}
        content={aiResultContent}
        isLoading={aiLoading}
        actions={[
          { label: "Replace", onClick: handleReplace },
          { label: "Insert Below", onClick: handleInsertBelow, variant: "outline" },
        ]}
      />
    </>
  );
}
