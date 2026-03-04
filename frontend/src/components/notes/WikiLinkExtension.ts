import { Node, mergeAttributes } from "@tiptap/core";

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (noteId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attributes: { noteId: string; title: string }) => ReturnType;
    };
  }
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => ({ "data-note-id": attributes.noteId }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wiki-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "wiki-link",
        class:
          "wiki-link inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm cursor-pointer hover:bg-primary/20 transition-colors",
      }),
      `[[${HTMLAttributes["data-title"] || ""}]]`,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span");
      dom.setAttribute("data-type", "wiki-link");
      dom.setAttribute("data-note-id", node.attrs.noteId || "");
      dom.setAttribute("data-title", node.attrs.title || "");
      dom.className =
        "wiki-link inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary font-medium text-sm cursor-pointer hover:bg-primary/20 transition-colors";
      dom.textContent = `[[${node.attrs.title || ""}]]`;

      dom.addEventListener("click", () => {
        if (this.options.onNavigate && node.attrs.noteId) {
          this.options.onNavigate(node.attrs.noteId);
        }
      });

      return { dom };
    };
  },
});
