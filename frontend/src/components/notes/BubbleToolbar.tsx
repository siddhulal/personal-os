"use client";

import { useState } from "react";
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

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [showHeadings, setShowHeadings] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultOpen, setAiResultOpen] = useState(false);
  const [aiResultContent, setAiResultContent] = useState("");
  const [aiResultTitle, setAiResultTitle] = useState("");
  const [selectedText, setSelectedText] = useState("");

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

  const btnBase =
    "h-8 w-8 flex items-center justify-center rounded-md transition-colors hover:bg-accent/30";

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{
          duration: 150,
          placement: "top",
          onHide: () => {
            setShowHeadings(false);
            setShowAiMenu(false);
          },
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
