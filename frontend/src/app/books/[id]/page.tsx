"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Maximize,
  Minimize,
  BookOpen,
  Bot,
  X,
  Bookmark,
  BookmarkCheck,
  Copy,
  Save,
  Lightbulb,
  Code,
  GitBranch,
  GraduationCap,
  MessageCircle,
  Send,
  Loader2,
  Moon,
  Sun,
  Columns2,
  FileText,
  List,
  FolderOpen,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchBook,
  updateBookProgress,
  fetchHighlights,
  createHighlight,
  fetchBookmarks,
  createBookmark,
  deleteBookmark,
  bookAiAction,
} from "@/lib/api/books";
import { fetchNotebooks, fetchSections, createSection, createPage } from "@/lib/api/notebooks";
import api from "@/lib/api";
import type { Book, BookHighlight, BookBookmark, AiGenerateResponse, Notebook } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Dynamically import to avoid SSR issues with canvas
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);
const PageComponent = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

// ── Types ────────────────────────────────────────────────────────────
type ViewMode = "scroll" | "single" | "double";

interface AiInteraction {
  selectedText: string;
  actionType: string;
  response: string;
  timestamp: number;
}

// ── Markdown to HTML converter ────────────────────────────────────────
function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (```lang\ncode\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headings (### → h3, etc.)
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^\*\*\*$/gm, "<hr>");

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Unordered lists — collect consecutive bullet lines into <ul>
  html = html.replace(/((?:^[ \t]*[*\-] .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((line) => {
      const text = line.replace(/^[ \t]*[*\-] /, "");
      return `<li>${text}</li>`;
    });
    return `<ul>${items.join("")}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((line) => {
      const text = line.replace(/^\d+\. /, "");
      return `<li>${text}</li>`;
    });
    return `<ol>${items.join("")}</ol>`;
  });

  // Wrap remaining plain text lines in <p> (skip already tagged lines)
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|p|ul|ol|li|pre|code|blockquote|hr|div)/.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");

  return html;
}

// ── Component ────────────────────────────────────────────────────────
export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = params.id as string;

  // ── State ────────────────────────────────────────────────────────
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<AiInteraction[]>([]);
  const [askQuestion, setAskQuestion] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [saveToNotesIdx, setSaveToNotesIdx] = useState<number | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfAreaRef = useRef<HTMLDivElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [pdfAreaSize, setPdfAreaSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // ── Queries ──────────────────────────────────────────────────────
  const { data: book } = useQuery<Book>({
    queryKey: ["book", bookId],
    queryFn: () => fetchBook(bookId),
  });

  const { data: highlights = [] } = useQuery<BookHighlight[]>({
    queryKey: ["bookHighlights", bookId],
    queryFn: () => fetchHighlights(bookId),
  });

  const { data: bookmarks = [] } = useQuery<BookBookmark[]>({
    queryKey: ["bookBookmarks", bookId],
    queryFn: () => fetchBookmarks(bookId),
  });

  // ── Mutations ────────────────────────────────────────────────────
  const progressMutation = useMutation({
    mutationFn: (page: number) => updateBookProgress(bookId, page),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["book", bookId] }),
  });

  const highlightMutation = useMutation({
    mutationFn: (data: Parameters<typeof createHighlight>[1]) =>
      createHighlight(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookHighlights", bookId] });
      toast.success("Highlight saved");
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (data: { pageNumber: number; label?: string }) =>
      createBookmark(bookId, data.pageNumber, data.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookBookmarks", bookId] });
      toast.success("Bookmark added");
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (bmId: string) => deleteBookmark(bookId, bmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookBookmarks", bookId] });
      toast.success("Bookmark removed");
    },
  });

  // ── Initialize page from book progress ───────────────────────────
  useEffect(() => {
    if (book?.currentPage && book.currentPage > 0) {
      setCurrentPage(book.currentPage);
    }
  }, [book?.currentPage]);

  // ── Save progress when page changes ──────────────────────────────
  useEffect(() => {
    if (currentPage > 0 && pdfReady) {
      const timer = setTimeout(() => {
        progressMutation.mutate(currentPage);
      }, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pdfReady]);

  // ── Configure react-pdf worker ───────────────────────────────────
  useEffect(() => {
    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  // ── Track PDF area size for fit-to-screen in double mode ────────
  useEffect(() => {
    const el = pdfAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPdfAreaSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Keyboard navigation ──────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        setCurrentPage(1);
      } else if (e.key === "End" && numPages) {
        setCurrentPage(numPages);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setAiPanelOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, currentPage, viewMode]);

  // ── Text selection handler ───────────────────────────────────────
  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 3) {
        setSelectedText(text);
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
          setShowSelectionToolbar(true);
        }
      } else {
        setShowSelectionToolbar(false);
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-selection-toolbar]")) {
        setShowSelectionToolbar(false);
      }
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // ── Pinch-to-zoom & Ctrl+scroll zoom ─────────────────────────────
  const lastPinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    const el = pdfAreaRef.current;
    if (!el) return;

    // Ctrl + mouse wheel zoom (desktop trackpad / mouse)
    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setScale((s) => Math.min(3.0, Math.max(0.3, s + delta)));
      }
    }

    // Touch pinch zoom
    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDistRef.current !== null) {
          const delta = (dist - lastPinchDistRef.current) * 0.005;
          setScale((s) => Math.min(3.0, Math.max(0.3, s + delta)));
        }
        lastPinchDistRef.current = dist;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        lastPinchDistRef.current = null;
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // ── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const step = viewMode === "double" ? 2 : 1;
    setCurrentPage((p) => Math.min(p + step, numPages));
  }, [viewMode, numPages]);

  const goPrev = useCallback(() => {
    const step = viewMode === "double" ? 2 : 1;
    setCurrentPage((p) => Math.max(p - step, 1));
  }, [viewMode]);

  // ── Swipe gesture navigation ────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (viewMode === "scroll") return;
    // Only track single-finger swipes; multi-touch is for pinch-to-zoom
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, [viewMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (viewMode === "scroll" || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Must be mostly horizontal, at least 50px, and within 500ms
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      if (dx < 0) goNext();  // Swipe left → next page
      else goPrev();          // Swipe right → prev page
    }
  }, [viewMode, goNext, goPrev]);

  // ── Fullscreen ───────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  // ── AI Actions ───────────────────────────────────────────────────
  async function handleAiAction(actionType: string, question?: string) {
    if (!selectedText && actionType !== "ASK") return;
    setAiLoading(true);
    setAiPanelOpen(true);
    setShowSelectionToolbar(false);

    try {
      const result = await bookAiAction(bookId, {
        selectedText: selectedText || question || "",
        pageNumber: currentPage,
        actionType,
        question,
      });

      const interaction: AiInteraction = {
        selectedText: selectedText || question || "",
        actionType,
        response: result.content,
        timestamp: Date.now(),
      };
      setAiHistory((prev) => [...prev, interaction]);

      // Auto-save highlight
      if (selectedText && actionType !== "ASK") {
        highlightMutation.mutate({
          pageNumber: currentPage,
          selectedText,
          aiResponse: result.content,
          aiActionType: actionType,
        });
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!askQuestion.trim()) return;
    await handleAiAction("ASK", askQuestion.trim());
    setAskQuestion("");
  }

  // ── Save interview questions from AI response ────────────────────
  async function saveInterviewQuestions(responseText: string) {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        toast.error("Could not parse interview questions");
        return;
      }
      const questions = JSON.parse(jsonMatch[0]);

      for (const q of questions) {
        await api.post("/api/interview/questions", {
          questionText: q.question || q.text,
          category: q.category || "TECHNICAL",
          difficulty: q.difficulty || "MEDIUM",
        });
      }

      toast.success(`${questions.length} questions saved to Interview Prep`);
    } catch {
      toast.error("Failed to save interview questions");
    }
  }

  // ── Save AI response to Notes ───────────────────────────────────
  async function openNotebookPicker(aiIdx: number) {
    try {
      const nbs = await fetchNotebooks();
      setNotebooks(nbs);
      setSaveToNotesIdx(aiIdx);
    } catch {
      toast.error("Failed to load notebooks");
    }
  }

  async function saveAiResponseToNotebook(notebookId: string) {
    if (saveToNotesIdx === null) return;
    const item = aiHistory[saveToNotesIdx];
    if (!item) return;

    try {
      // Get or create a section in the notebook
      let sections = await fetchSections(notebookId);
      let sectionId: string;
      const bookSection = sections.find((s) => s.name === "Book Notes");
      if (bookSection) {
        sectionId = bookSection.id;
      } else if (sections.length > 0) {
        sectionId = sections[0].id;
      } else {
        const newSection = await createSection(notebookId, { name: "Book Notes" });
        sectionId = newSection.id;
      }

      const title = `${book?.title || "Book"} - ${item.actionType} (p.${currentPage})`;
      const rawMd = item.selectedText
        ? `> ${item.selectedText}\n\n---\n\n${item.response}`
        : item.response;
      const htmlContent = markdownToHtml(rawMd);

      await createPage({
        title,
        content: htmlContent,
        notebookId,
        sectionId,
      });
      toast.success("Saved to notebook");
      setSaveToNotesIdx(null);
    } catch {
      toast.error("Failed to save to notebook");
    }
  }

  // ── Bookmark helpers ─────────────────────────────────────────────
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);
  const currentBookmark = bookmarks.find((b) => b.pageNumber === currentPage);

  function toggleBookmark() {
    if (isCurrentPageBookmarked && currentBookmark) {
      removeBookmarkMutation.mutate(currentBookmark.id);
    } else {
      bookmarkMutation.mutate({ pageNumber: currentPage });
    }
  }

  // ── PDF file URL ─────────────────────────────────────────────────
  const fileUrl = book?.fileUrl
    ? `${typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8080` : ""}${book.fileUrl}`
    : null;

  const progress = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;

  if (!book) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-screen flex flex-col ${nightMode ? "bg-[#1a1a2e] text-gray-200" : "bg-background text-foreground"}`}
    >
      {/* ── Top Toolbar ─────────────────────────────────────────────── */}
      <div className={`h-12 flex items-center justify-between px-4 border-b shrink-0 ${nightMode ? "border-gray-700 bg-[#16213e]" : "border-border bg-card"}`}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/books")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate max-w-[300px]">{book.title}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className={`flex items-center gap-0.5 rounded-md p-0.5 ${nightMode ? "bg-gray-700/50" : "bg-muted/50"}`}>
            <button
              onClick={() => setViewMode("scroll")}
              title="Scroll view"
              className={`p-1.5 rounded transition-colors ${viewMode === "scroll" ? (nightMode ? "bg-gray-600" : "bg-background shadow-sm") : ""}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("single")}
              title="Single page"
              className={`p-1.5 rounded transition-colors ${viewMode === "single" ? (nightMode ? "bg-gray-600" : "bg-background shadow-sm") : ""}`}
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("double")}
              title="Double page"
              className={`p-1.5 rounded transition-colors ${viewMode === "double" ? (nightMode ? "bg-gray-600" : "bg-background shadow-sm") : ""}`}
            >
              <Columns2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
            -
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}>
            +
          </Button>

          {/* Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleBookmark}
            title={isCurrentPageBookmarked ? "Remove bookmark" : "Bookmark this page"}
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-amber-500" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowBookmarks(!showBookmarks)}
            title="Bookmarks list"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNightMode(!nightMode)} title="Toggle night mode">
            {nightMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Bookmarks sidebar */}
        {showBookmarks && (
          <div className={`w-56 border-r overflow-y-auto shrink-0 ${nightMode ? "border-gray-700 bg-[#16213e]" : "border-border bg-card"}`}>
            <div className="p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Bookmarks ({bookmarks.length})
              </h3>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No bookmarks yet</p>
              ) : (
                <div className="space-y-1">
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => setCurrentPage(bm.pageNumber)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent/50 transition-colors ${
                        bm.pageNumber === currentPage ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <span className="font-medium">Page {bm.pageNumber}</span>
                      {bm.label && <span className="text-muted-foreground ml-1">- {bm.label}</span>}
                    </button>
                  ))}
                </div>
              )}

              {highlights.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-4">
                    Highlights ({highlights.length})
                  </h3>
                  <div className="space-y-1">
                    {highlights.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setCurrentPage(h.pageNumber)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent/50 transition-colors"
                      >
                        <span className="font-medium">Page {h.pageNumber}</span>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5">
                          {h.selectedText}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* PDF Reader Area */}
        <div
          ref={pdfAreaRef}
          className={`flex-1 overflow-auto relative ${nightMode ? "bg-[#1a1a2e]" : "bg-muted/30"}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {fileUrl && (
            <div className={`flex justify-center ${viewMode === "scroll" ? "py-4" : "h-full items-center"}`}>
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages: n }) => {
                  setNumPages(n);
                  setPdfReady(true);
                  if (book.totalPages === 0) {
                    // Update total pages in backend
                    updateBookProgress(bookId, book.currentPage || 0);
                  }
                }}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BookOpen className="h-12 w-12 mb-4 opacity-30" />
                    <p>Failed to load PDF</p>
                  </div>
                }
                className={viewMode === "double" ? "flex gap-2 px-4" : ""}
              >
                {viewMode === "scroll" ? (
                  // Scroll mode: render all pages
                  Array.from({ length: numPages }, (_, i) => (
                    <div key={i} className="mb-4 shadow-lg">
                      <PageComponent
                        pageNumber={i + 1}
                        scale={scale}
                        className={nightMode ? "invert hue-rotate-180" : ""}
                      />
                    </div>
                  ))
                ) : viewMode === "double" ? (
                  // Double page mode — fit both pages to fill available area
                  (() => {
                    const gap = 8; // gap between pages
                    const padding = 32; // horizontal padding
                    const hasSecondPage = currentPage + 1 <= numPages;
                    const pageCount = hasSecondPage ? 2 : 1;
                    // Each page gets half the available width (minus gap and padding), then apply user scale
                    const pageWidth = pdfAreaSize.width > 0
                      ? ((pdfAreaSize.width - padding - gap * (pageCount - 1)) / pageCount) * scale
                      : undefined;
                    return (
                      <>
                        <div className="shadow-lg">
                          <PageComponent
                            pageNumber={currentPage}
                            width={pageWidth}
                            className={nightMode ? "invert hue-rotate-180" : ""}
                          />
                        </div>
                        {hasSecondPage && (
                          <div className="shadow-lg">
                            <PageComponent
                              pageNumber={currentPage + 1}
                              width={pageWidth}
                              className={nightMode ? "invert hue-rotate-180" : ""}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  // Single page mode
                  <div className="shadow-lg">
                    <PageComponent
                      pageNumber={currentPage}
                      scale={scale}
                      className={nightMode ? "invert hue-rotate-180" : ""}
                    />
                  </div>
                )}
              </Document>
            </div>
          )}

          {/* Selection Toolbar */}
          {showSelectionToolbar && selectedText && (
            <div
              data-selection-toolbar
              className="fixed z-50 flex items-center gap-1 bg-popover border border-border rounded-lg shadow-xl p-1"
              style={{
                left: `${toolbarPos.x}px`,
                top: `${toolbarPos.y}px`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleAiAction("EXPLAIN")}>
                <Lightbulb className="h-3 w-3" /> Explain
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleAiAction("CODE")}>
                <Code className="h-3 w-3" /> Code
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleAiAction("DIAGRAM")}>
                <GitBranch className="h-3 w-3" /> Diagram
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                highlightMutation.mutate({
                  pageNumber: currentPage,
                  selectedText,
                });
                setShowSelectionToolbar(false);
              }}>
                <Save className="h-3 w-3" /> Notes
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleAiAction("INTERVIEW")}>
                <GraduationCap className="h-3 w-3" /> Interview
              </Button>
            </div>
          )}
        </div>

        {/* AI Panel (overlay) */}
        {aiPanelOpen && (
          <div
            ref={aiPanelRef}
            className={`absolute top-0 right-0 bottom-0 w-[400px] border-l flex flex-col z-30 shadow-2xl ${nightMode ? "border-gray-700 bg-[#16213e]" : "border-border bg-card"}`}
          >
            {/* AI Panel Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">AI Assistant</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiPanelOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* AI Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiHistory.length === 0 && !aiLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select text in the book and choose an action</p>
                  <p className="text-xs mt-1">or ask a question below</p>
                </div>
              )}

              {aiHistory.map((item, i) => (
                <div key={i} className={`rounded-lg border p-3 ${nightMode ? "border-gray-600" : "border-border"}`}>
                  {/* Selected text context */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.actionType}
                    </Badge>
                  </div>
                  {item.selectedText && item.actionType !== "ASK" && (
                    <div className={`text-xs p-2 rounded mb-2 border-l-2 border-primary/50 ${nightMode ? "bg-gray-700/50" : "bg-muted/50"}`}>
                      &ldquo;{item.selectedText.length > 200 ? item.selectedText.slice(0, 200) + "..." : item.selectedText}&rdquo;
                    </div>
                  )}
                  {item.actionType === "ASK" && (
                    <div className={`text-xs p-2 rounded mb-2 ${nightMode ? "bg-blue-900/30" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                      <strong>Q:</strong> {item.selectedText}
                    </div>
                  )}

                  {/* AI Response */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_code]:text-xs [&_strong]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.response}
                    </ReactMarkdown>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        navigator.clipboard.writeText(item.response);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-primary"
                      onClick={() => openNotebookPicker(i)}
                    >
                      <Save className="h-3 w-3 mr-1" /> Save to Notes
                    </Button>
                    {item.actionType === "INTERVIEW" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-primary"
                        onClick={() => saveInterviewQuestions(item.response)}
                      >
                        <GraduationCap className="h-3 w-3 mr-1" /> Save to Interview
                      </Button>
                    )}

                    {/* Notebook picker dropdown */}
                    {saveToNotesIdx === i && (
                      <div className={`w-full mt-2 rounded-lg border p-2 ${nightMode ? "border-gray-600 bg-gray-800" : "border-border bg-background"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Notebook</span>
                          <button onClick={() => setSaveToNotesIdx(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {notebooks.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No notebooks found</p>
                        ) : (
                          <div className="space-y-0.5 max-h-32 overflow-y-auto">
                            {notebooks.map((nb) => (
                              <button
                                key={nb.id}
                                onClick={() => saveAiResponseToNotebook(nb.id)}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent/50 transition-colors"
                              >
                                <FolderOpen className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate">{nb.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            {/* Ask Question Input */}
            <div className="p-3 border-t border-border shrink-0">
              <form onSubmit={handleAskSubmit} className="flex gap-2">
                <Input
                  placeholder="Ask about this book..."
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  className="h-9 text-sm"
                  disabled={aiLoading}
                />
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={aiLoading || !askQuestion.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation Bar ───────────────────────────────────── */}
      {viewMode !== "scroll" && (
        <div className={`h-12 flex items-center justify-between px-4 border-t shrink-0 ${nightMode ? "border-gray-700 bg-[#16213e]" : "border-border bg-card"}`}>
          <Button variant="ghost" size="sm" className="h-8" onClick={goPrev} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Page</span>
            <Input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= numPages) setCurrentPage(v);
              }}
              className="h-7 w-16 text-center text-sm"
            />
            <span className="text-sm text-muted-foreground">of {numPages}</span>
          </div>

          <Button variant="ghost" size="sm" className="h-8" onClick={goNext} disabled={currentPage >= numPages}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <div className={`h-1 ${nightMode ? "bg-gray-700" : "bg-muted"}`}>
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating AI Button (when panel is closed) */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="fixed bottom-16 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
          title="AI Assistant (Cmd+.)"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
