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
import { useEffect } from "react";
import { WikiLink } from "./WikiLinkExtension";
import { WikiLinkSuggestion } from "./WikiLinkSuggestion";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { BubbleToolbar } from "./BubbleToolbar";
import { Callout } from "./CalloutExtension";

const lowlight = createLowlight(common);

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

  return (
    <div className="overflow-hidden bg-background relative">
      <div className="relative">
        <EditorContent editor={editor} />
        <BubbleToolbar editor={editor} />
        <WikiLinkSuggestion editor={editor} />
        <SlashCommandMenu editor={editor} />
      </div>
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
