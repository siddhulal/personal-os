"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotebookSidebar } from "@/components/notes/NotebookSidebar";
import { SectionPageList } from "@/components/notes/SectionPageList";
import { TipTapEditor } from "@/components/notes/TipTapEditor";
import { BacklinksPanel } from "@/components/notes/BacklinksPanel";
import { TagPanel } from "@/components/notes/TagPanel";
import { KnowledgeGraph } from "@/components/notes/KnowledgeGraph";
import { RelatedNotesPanel } from "@/components/notes/RelatedNotesPanel";
import { AutoLinkSuggestions } from "@/components/notes/AutoLinkSuggestions";
import { useAutosave } from "@/lib/hooks/useAutosave";
import {
  fetchNotebooks,
  fetchPages,
  fetchPage,
  updatePage,
  searchNotes,
  getOrCreateDailyNote,
  createNoteLink,
  syncNoteLinks,
} from "@/lib/api/notebooks";
import type { Notebook, Note } from "@/types";
import {
  PanelLeft,
  PanelLeftClose,
  List,
  ListX,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Network,
  Link2,
  Book,
  FileText,
} from "lucide-react";
import { CommandPalette } from "@/components/notes/CommandPalette";
import { useTheme } from "next-themes";

/** Recursively walk TipTap JSON to extract all wiki-link noteIds */
function extractWikiLinkIds(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const doc = typeof json === "string" ? JSON.parse(json) : json;
    const ids: string[] = [];
    const walk = (node: any): void => {
      if (!node) return;
      if (node.type === "wikiLink" && node.attrs?.noteId) {
        ids.push(node.attrs.noteId);
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(walk);
      }
    };
    walk(doc);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingContentJson, setPendingContentJson] = useState<string | null>(null);
  const [pendingContentText, setPendingContentText] = useState<string | null>(null);
  const [showNotebooks, setShowNotebooks] = useState(true);
  const [showPages, setShowPages] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(true);

  // Escape key exits fullscreen, Cmd+K opens command palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // Fetch notebooks
  const { data: notebooks = [] } = useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: fetchNotebooks,
  });

  // Auto-select first notebook/section if none selected
  useEffect(() => {
    if (!selectedNotebookId && notebooks.length > 0) {
      const firstNotebook = notebooks[0];
      if (firstNotebook.sections.length > 0) {
        setSelectedNotebookId(firstNotebook.id);
        setSelectedSectionId(firstNotebook.sections[0].id);
      }
    }
  }, [selectedNotebookId, notebooks]);

  // Fetch pages for selected section
  const { data: pages = [] } = useQuery<Note[]>({
    queryKey: ["pages", selectedSectionId],
    queryFn: () => fetchPages(selectedSectionId!),
    enabled: !!selectedSectionId,
  });

  // Fetch search results
  const { data: searchResults = [] } = useQuery<Note[]>({
    queryKey: ["notes-search", searchQuery],
    queryFn: () => searchNotes(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  // Fetch selected page content
  const { data: selectedPage } = useQuery<Note>({
    queryKey: ["page", selectedPageId],
    queryFn: () => fetchPage(selectedPageId!),
    enabled: !!selectedPageId,
  });

  // Update page mutation
  const updatePageMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { title: string; content?: string; contentJson?: string };
    }) => updatePage(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pages", selectedSectionId] });
      queryClient.invalidateQueries({ queryKey: ["page", selectedPageId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });

      // Sync wiki links from content
      const linkIds = extractWikiLinkIds(variables.data.contentJson);
      if (variables.id) {
        syncNoteLinks(variables.id, linkIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["backlinks"] });
            queryClient.invalidateQueries({ queryKey: ["note-graph"] });
          })
          .catch(() => {});
      }
    },
    onError: () => {
      toast.error("Failed to save");
    },
  });

  // Daily note mutation
  const dailyNoteMutation = useMutation({
    mutationFn: () => getOrCreateDailyNote(),
    onSuccess: (note) => {
      setSelectedPageId(note.id);
      setEditingTitle(note.title);
      setPendingContentJson(null);
      setPendingContentText(null);
      if (!note.sectionId) {
        setSelectedSectionId(null);
      }
      toast.success("Daily note ready");
    },
    onError: () => toast.error("Failed to create daily note"),
  });

  // Autosave
  const doSave = useCallback(() => {
    if (!selectedPageId) return;
    updatePageMutation.mutate({
      id: selectedPageId,
      data: {
        title: editingTitle || "Untitled",
        content: pendingContentText ?? selectedPage?.content ?? "",
        contentJson: pendingContentJson ?? selectedPage?.contentJson ?? undefined,
      },
    });
  }, [selectedPageId, editingTitle, pendingContentJson, pendingContentText, selectedPage, updatePageMutation]);

  const { trigger: triggerAutosave } = useAutosave(doSave, 1000);

  function handleSelectSection(notebookId: string, sectionId: string) {
    setSelectedNotebookId(notebookId);
    setSelectedSectionId(sectionId);
    setSelectedPageId(null);
    setSearchQuery("");
  }

  function handleSelectPage(pageId: string) {
    setSelectedPageId(pageId);
    setPendingContentJson(null);
    setPendingContentText(null);
    const page = pages.find((p) => p.id === pageId) || searchResults.find((p) => p.id === pageId);
    setEditingTitle(page?.title ?? "Untitled");
  }

  function handleTitleChange(title: string) {
    setEditingTitle(title);
    triggerAutosave();
  }

  function handleEditorUpdate(json: string, text: string) {
    setPendingContentJson(json);
    setPendingContentText(text);
    triggerAutosave();
  }

  function handleNavigateToNote(noteId: string) {
    if (selectedPageId && selectedPageId !== noteId) {
      createNoteLink(selectedPageId, noteId).catch(() => {});
    }
    setSelectedPageId(noteId);
    setPendingContentJson(null);
    setPendingContentText(null);
  }

  const displayPages = searchQuery.length >= 2 ? searchResults : pages;
  const editorContent = pendingContentJson || selectedPage?.contentJson || selectedPage?.content || null;

  // Breadcrumb parts
  const currentNotebook = notebooks.find((n) => n.id === selectedNotebookId);
  const currentSection = currentNotebook?.sections?.find((s: { id: string; name: string }) => s.id === selectedSectionId);

  // Word count
  const wordCount = useMemo(() => {
    const text = pendingContentText ?? selectedPage?.content ?? "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    return { words, chars };
  }, [pendingContentText, selectedPage?.content]);

  // Editor panel content
  const editorPanel = (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {selectedPageId && selectedPage ? (
        <>
          {/* Editor header */}
          <div className="border-b border-border/50 bg-card/30 px-4 py-2 shrink-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 overflow-hidden">
              {!fullscreen && (
                <>
                  {currentNotebook && (
                    <span className="truncate">{currentNotebook.name}</span>
                  )}
                  {currentSection && (
                    <>
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      <span className="truncate">{currentSection.name}</span>
                    </>
                  )}
                  {(currentNotebook || currentSection) && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  )}
                </>
              )}
              <span className="text-2xl font-bold tracking-tight text-foreground truncate">
                {editingTitle || "Untitled"}
              </span>
              {updatePageMutation.isPending && (
                <span className="text-primary text-xs ml-2">Saving...</span>
              )}
              {selectedPage.isDailyNote && (
                <span className="text-primary text-xs font-medium ml-2">Daily</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!fullscreen && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowNotebooks(!showNotebooks)}
                    title={showNotebooks ? "Hide notebooks" : "Show notebooks"}
                  >
                    {showNotebooks ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowPages(!showPages)}
                    title={showPages ? "Hide page list" : "Show page list"}
                  >
                    {showPages ? (
                      <ListX className="h-4 w-4" />
                    ) : (
                      <List className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setGraphOpen(true)}
                title="Knowledge Graph"
              >
                <Network className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Title input */}
          <div className="px-6 pt-4 shrink-0">
            <Input
              value={editingTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Page title"
              className="border-0 text-xl font-semibold px-0 h-auto focus-visible:ring-0 shadow-none"
            />
          </div>

          {/* Tags */}
          <TagPanel note={selectedPage} />

          {/* Editor */}
          <div className="flex-1 overflow-y-auto">
            <TipTapEditor
              content={editorContent}
              onUpdate={handleEditorUpdate}
              onNavigateToNote={handleNavigateToNote}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-border/30 px-4 py-1.5 shrink-0 flex items-center justify-between text-xs text-muted-foreground/70">
            <span>
              {wordCount.words} words &middot; {wordCount.chars} characters
            </span>
            <span>
              Last saved: {new Date(selectedPage.updatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Connections Panel (tabbed: Backlinks / Links / Related) */}
          {!fullscreen && (
            <div className="border-t border-border/50">
              {/* Connections header with toggle */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setConnectionsOpen(!connectionsOpen)}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Connections</span>
                {connectionsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 ml-auto" />
                )}
              </button>

              {/* Collapsible content */}
              <div
                className={`grid transition-[grid-template-rows] duration-250 ease-in-out ${
                  connectionsOpen ? "grid-rows-collapse-open" : "grid-rows-collapse-closed"
                }`}
              >
                <div className="overflow-hidden">
                  <Tabs defaultValue="backlinks" className="px-2 pb-2">
                    <TabsList className="h-8 w-full">
                      <TabsTrigger value="backlinks" className="text-xs flex-1">
                        Backlinks
                      </TabsTrigger>
                      <TabsTrigger value="links" className="text-xs flex-1">
                        Links
                      </TabsTrigger>
                      <TabsTrigger value="related" className="text-xs flex-1">
                        Related
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="backlinks" className="mt-1">
                      <BacklinksPanel
                        noteId={selectedPageId}
                        onNavigate={handleNavigateToNote}
                      />
                    </TabsContent>
                    <TabsContent value="links" className="mt-1">
                      <AutoLinkSuggestions
                        noteId={selectedPageId}
                        onNavigate={handleNavigateToNote}
                      />
                    </TabsContent>
                    <TabsContent value="related" className="mt-1">
                      <RelatedNotesPanel
                        noteId={selectedPageId}
                        onNavigate={handleNavigateToNote}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium">No page selected</p>
            <p className="text-sm mt-1">
              Select a page from the list or create a new one
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const commandPalette = (
    <CommandPalette
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      onSelectNote={(noteId) => {
        setSelectedPageId(noteId);
        setPendingContentJson(null);
        setPendingContentText(null);
      }}
      onDailyNote={() => dailyNoteMutation.mutate()}
      onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
    />
  );

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <AppShell noPadding>
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {editorPanel}
        </div>
        {commandPalette}
      </AppShell>
    );
  }

  return (
    <AppShell noPadding>
      <div className="flex h-screen">
        {/* Column 1: Notebook Sidebar */}
        {showNotebooks ? (
          <div
            className="border-r bg-card/40 shrink-0 overflow-hidden transition-[width] duration-250 ease-in-out"
            style={{ width: "16rem" }}
          >
            <div className="w-64 h-full">
              <NotebookSidebar
                notebooks={notebooks}
                selectedNotebookId={selectedNotebookId}
                selectedSectionId={selectedSectionId}
                onSelectSection={handleSelectSection}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenDailyNote={() => dailyNoteMutation.mutate()}
                onCollapse={() => setShowNotebooks(false)}
              />
            </div>
          </div>
        ) : (
          <div className="shrink-0 w-8 border-r bg-card/40 flex flex-col items-center pt-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNotebooks(true)}
              title="Show notebooks"
            >
              <Book className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Column 2: Page List */}
        {showPages ? (
          <div
            className="border-r bg-card/20 shrink-0 overflow-hidden transition-[width] duration-250 ease-in-out"
            style={{ width: "18rem" }}
          >
            <div className="w-72 h-full">
              <SectionPageList
                pages={displayPages}
                selectedPageId={selectedPageId}
                onSelectPage={handleSelectPage}
                sectionId={selectedSectionId}
                notebookId={selectedNotebookId}
                onCollapse={() => setShowPages(false)}
              />
            </div>
          </div>
        ) : (
          <div className="shrink-0 w-8 border-r bg-card/20 flex flex-col items-center pt-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPages(true)}
              title="Show pages"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Column 3: Editor */}
        {editorPanel}
      </div>
      {commandPalette}
      <KnowledgeGraph
        open={graphOpen}
        onOpenChange={setGraphOpen}
        onNavigateToNote={handleNavigateToNote}
        currentNoteId={selectedPageId}
      />
    </AppShell>
  );
}
