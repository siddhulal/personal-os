"use client";

import { useEditor, EditorContent, type Content } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  PenLine,
  Code,
  BookOpen,
  FileText,
  ListCollapse,
  ClipboardList,
} from "lucide-react";
import { WikiLink } from "./WikiLinkExtension";
import { WikiLinkSuggestion } from "./WikiLinkSuggestion";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { BubbleToolbar } from "./BubbleToolbar";
import { Callout } from "./CalloutExtension";
import { AiResultDialog } from "@/components/ai/AiResultDialog";
import { noteAssist } from "@/lib/api/ai";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";

const lowlight = createLowlight(common);

const NOTE_AI_ACTIONS = [
  { label: "Continue Writing", action: "continue", icon: PenLine },
  { label: "Generate Example", action: "generate_example", icon: Code },
  { label: "Explain", action: "explain", icon: BookOpen },
  { label: "Add Details", action: "add_details", icon: FileText },
  { label: "Summarize", action: "summarize", icon: ListCollapse },
  { label: "Generate Quiz", action: "generate_quiz", icon: ClipboardList },
];

interface TipTapEditorProps {
  content: string | null;
  onUpdate: (json: string, text: string) => void;
  editable?: boolean;
  onNavigateToNote?: (noteId: string) => void;
}

export function TipTapEditor({
  content,
  onUpdate,
  editable = true,
  onNavigateToNote,
}: TipTapEditorProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultOpen, setAiResultOpen] = useState(false);
  const [aiResultContent, setAiResultContent] = useState("");
  const [aiResultTitle, setAiResultTitle] = useState("");
  const { setPageActions, clearPageActions } = useAiChat();
  const editorRef = useRef<ReturnType<typeof useEditor>>(null) as React.MutableRefObject<ReturnType<typeof useEditor>>;

  const handleAiAction = useCallback(
    async (action: string, textAboveCursor: string, fullNoteText: string) => {
      const actionLabels: Record<string, string> = {
        continue: "Continue Writing",
        generate_example: "Generate Example",
        explain: "Explain",
        add_details: "Add Details",
        summarize: "Summarize",
        generate_quiz: "Generate Quiz",
      };

      setAiLoading(true);
      setAiResultTitle(`AI ${actionLabels[action] || action}`);
      setAiResultContent("");
      setAiResultOpen(true);

      try {
        const result = await noteAssist(action, textAboveCursor, fullNoteText);
        setAiResultContent(result.content);
      } catch {
        setAiResultContent("Failed to process text. Please check your AI settings.");
      } finally {
        setAiLoading(false);
      }
    },
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // Replaced by CodeBlockLowlight
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, '[[' to link notes",
      }),
      Underline,
      Callout,
      WikiLink.configure({
        onNavigate: onNavigateToNote,
      }),
    ],
    content: content ? tryParseJson(content) : "",
    editable,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const text = editor.getText();
      onUpdate(json, text);
    },
  });

  // Keep editorRef in sync
  editorRef.current = editor;

  // Register page-specific AI actions with the global button
  useEffect(() => {
    if (!editable) return;

    const actions: PageAiAction[] = NOTE_AI_ACTIONS.map((item) => ({
      label: item.label,
      action: item.action,
      icon: item.icon,
      onAction: () => {
        const ed = editorRef.current;
        if (!ed) return;
        const { from } = ed.state.selection;
        const textAboveCursor = ed.state.doc.textBetween(0, from, "\n");
        const fullNoteText = ed.getText();
        handleAiAction(item.action, textAboveCursor, fullNoteText);
      },
    }));

    setPageActions(actions);
    return () => clearPageActions();
  }, [editable, setPageActions, clearPageActions, handleAiAction]);

  useEffect(() => {
    if (!editor) return;
    if (content) {
      const parsed = tryParseJson(content);
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      if (currentJson !== newJson) {
        editor.commands.setContent(parsed);
      }
    } else {
      editor.commands.clearContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  if (!editor) return null;

  function handleInsertAtCursor() {
    if (!editor) return;
    const { from } = editor.state.selection;
    editor.chain().focus().insertContentAt(from, aiResultContent).run();
    setAiResultOpen(false);
  }

  function handleInsertAtEnd() {
    if (!editor) return;
    const endPos = editor.state.doc.content.size;
    editor.chain().focus().insertContentAt(endPos, "\n\n" + aiResultContent).run();
    setAiResultOpen(false);
  }

  return (
    <div className="overflow-hidden bg-background relative">
      <div className="relative">
        <EditorContent editor={editor} />
        <BubbleToolbar editor={editor} />
        <WikiLinkSuggestion editor={editor} />
        <SlashCommandMenu editor={editor} onAiAction={handleAiAction} />
      </div>

      <AiResultDialog
        open={aiResultOpen}
        onOpenChange={setAiResultOpen}
        title={aiResultTitle}
        content={aiResultContent}
        isLoading={aiLoading}
        actions={[
          { label: "Insert at Cursor", onClick: handleInsertAtCursor },
          { label: "Insert at End", onClick: handleInsertAtEnd, variant: "outline" },
        ]}
      />
    </div>
  );
}

function tryParseJson(content: string): Content {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
