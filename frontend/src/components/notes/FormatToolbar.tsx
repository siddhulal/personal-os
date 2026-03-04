"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Undo,
  Redo,
  Link,
} from "lucide-react";

interface FormatToolbarProps {
  editor: Editor;
}

export function FormatToolbar({ editor }: FormatToolbarProps) {
  const iconClass = "h-4 w-4";

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

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("bold") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("italic") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("underline") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("strike") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("code") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code"
      >
        <Code className={iconClass} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className={iconClass} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("bulletList") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("orderedList") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      >
        <ListOrdered className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("taskList") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task List"
      >
        <ListChecks className={iconClass} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("blockquote") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <Quote className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("codeBlock") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      >
        <Code className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("link") ? "bg-muted" : ""}`}
        onClick={setLink}
        title="Link"
      >
        <Link className={iconClass} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className={iconClass} />
      </Button>
    </div>
  );
}
