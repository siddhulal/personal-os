"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Upload,
  Search,
  Star,
  MoreVertical,
  Trash2,
  Edit,
  BookMarked,
  Eye,
  Clock,
  CheckCircle2,
  Pause,
  FileText,
  Highlighter,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchBooks,
  uploadBook,
  updateBook,
  deleteBook,
  updateBookRating,
  updateBookStatus,
  fetchBookStats,
} from "@/lib/api/books";
import type { Book, BookStats, PageResponse } from "@/types";
import Link from "next/link";

const PdfDocument = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);
const PdfPage = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

function BookCoverThumbnail({ fileUrl, title }: { fileUrl: string; title: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  const backendUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080${fileUrl}`
    : "";

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <PdfDocument
        file={backendUrl}
        onLoadSuccess={() => setReady(true)}
        loading={
          <div className="text-center p-4">
            <BookOpen className="h-10 w-10 mx-auto text-primary/40 mb-2" />
            <p className="text-xs font-medium text-primary/60 line-clamp-3">{title}</p>
          </div>
        }
        error={
          <div className="text-center p-4">
            <BookOpen className="h-10 w-10 mx-auto text-primary/40 mb-2" />
            <p className="text-xs font-medium text-primary/60 line-clamp-3">{title}</p>
          </div>
        }
      >
        {ready && (
          <PdfPage
            pageNumber={1}
            width={250}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </PdfDocument>
    </div>
  );
}

const CATEGORIES = [
  "GENERAL",
  "PROGRAMMING",
  "SYSTEM_DESIGN",
  "DATABASE",
  "DEVOPS",
  "ALGORITHMS",
  "ARCHITECTURE",
  "WEB",
  "MOBILE",
  "AI_ML",
  "CAREER",
  "OTHER",
];

const STATUS_FILTERS = [
  { value: "ALL", label: "All Books" },
  { value: "READING", label: "Reading" },
  { value: "UNREAD", label: "Unread" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  UNREAD: <BookOpen className="h-3.5 w-3.5" />,
  READING: <Eye className="h-3.5 w-3.5" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5" />,
  ON_HOLD: <Pause className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  UNREAD: "bg-muted text-muted-foreground",
  READING: "bg-blue-500/10 text-blue-500",
  COMPLETED: "bg-green-500/10 text-green-500",
  ON_HOLD: "bg-amber-500/10 text-amber-500",
};

export default function BooksPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAuthor, setUploadAuthor] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("GENERAL");
  const [uploadTotalPages, setUploadTotalPages] = useState("");

  const { data: booksPage, isLoading } = useQuery<PageResponse<Book>>({
    queryKey: ["books", statusFilter, search],
    queryFn: () =>
      fetchBooks({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search || undefined,
        size: 50,
      }),
  });

  const { data: stats } = useQuery<BookStats>({
    queryKey: ["bookStats"],
    queryFn: fetchBookStats,
  });

  const books = booksPage?.content ?? [];

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadBook(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
      toast.success("Book uploaded successfully");
      closeUploadDialog();
    },
    onError: () => toast.error("Failed to upload book"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateBook>[1] }) =>
      updateBook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Book updated");
      setEditBook(null);
    },
    onError: () => toast.error("Failed to update book"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
      toast.success("Book deleted");
    },
    onError: () => toast.error("Failed to delete book"),
  });

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      updateBookRating(id, rating),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBookStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
    },
  });

  function closeUploadDialog() {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadTitle("");
    setUploadAuthor("");
    setUploadDescription("");
    setUploadCategory("GENERAL");
    setUploadTotalPages("");
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error("Please select a file and enter a title");
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim());
    if (uploadAuthor.trim()) formData.append("author", uploadAuthor.trim());
    if (uploadDescription.trim()) formData.append("description", uploadDescription.trim());
    formData.append("category", uploadCategory);
    if (uploadTotalPages) formData.append("totalPages", uploadTotalPages);
    uploadMutation.mutate(formData);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBook) return;
    updateMutation.mutate({
      id: editBook.id,
      data: {
        title: editBook.title,
        author: editBook.author || undefined,
        description: editBook.description || undefined,
        category: editBook.category,
        totalPages: editBook.totalPages,
      },
    });
  }

  function getProgressPercent(book: Book) {
    if (!book.totalPages || book.totalPages === 0) return 0;
    return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  }

  const currentlyReading = books.find((b) => b.status === "READING");

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Books</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your personal library with AI-powered reading assistant
            </p>
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Book
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Books", value: stats.totalBooks, icon: BookOpen, color: "text-blue-500" },
              { label: "Reading", value: stats.reading, icon: Eye, color: "text-amber-500" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-500" },
              { label: "Pages Read", value: stats.pagesRead.toLocaleString(), icon: FileText, color: "text-purple-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Continue Reading */}
        {currentlyReading && (
          <div className="rounded-lg border border-border p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-9 rounded bg-primary/20 flex items-center justify-center">
                  <BookMarked className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Continue Reading</p>
                  <p className="font-semibold">{currentlyReading.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Page {currentlyReading.currentPage} of {currentlyReading.totalPages || "?"} ({getProgressPercent(currentlyReading)}%)
                  </p>
                </div>
              </div>
              <Link href={`/books/${currentlyReading.id}`}>
                <Button size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Continue Reading
                </Button>
              </Link>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${getProgressPercent(currentlyReading)}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Book Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-muted" />
                <div className="mt-2 h-4 bg-muted rounded w-3/4" />
                <div className="mt-1 h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium">No books yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a PDF or EPUB to start reading
            </p>
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((book) => {
              const progress = getProgressPercent(book);
              return (
                <div key={book.id} className="group relative">
                  <Link href={`/books/${book.id}`}>
                    <div className="aspect-[3/4] rounded-lg border border-border bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative">
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : book.fileUrl ? (
                        <BookCoverThumbnail fileUrl={book.fileUrl} title={book.title} />
                      ) : (
                        <div className="text-center p-4">
                          <BookOpen className="h-10 w-10 mx-auto text-primary/40 mb-2" />
                          <p className="text-xs font-medium text-primary/60 line-clamp-3">
                            {book.title}
                          </p>
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[book.status]}`}>
                          {book.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Progress bar at bottom */}
                      {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="mt-2">
                    <p className="text-sm font-medium line-clamp-1">{book.title}</p>
                    {book.author && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => ratingMutation.mutate({ id: book.id, rating: s })}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-3 w-3 ${
                                book.rating && s <= book.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {book.highlightCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Highlighter className="h-2.5 w-2.5" />
                            {book.highlightCount}
                          </span>
                        )}
                        {book.bookmarkCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Bookmark className="h-2.5 w-2.5" />
                            {book.bookmarkCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {book.totalPages > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {book.currentPage}/{book.totalPages} pages ({progress}%)
                      </p>
                    )}
                  </div>

                  {/* Actions dropdown */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditBook({ ...book })}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        {book.status !== "READING" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: book.id, status: "READING" })}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Mark as Reading
                          </DropdownMenuItem>
                        )}
                        {book.status !== "COMPLETED" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: book.id, status: "COMPLETED" })}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </DropdownMenuItem>
                        )}
                        {book.status !== "ON_HOLD" && (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: book.id, status: "ON_HOLD" })}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Put On Hold
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this book?")) {
                              deleteMutation.mutate(book.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={(open) => !open && closeUploadDialog()}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Upload Book</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Book File (PDF or EPUB)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {uploadFile ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to select a PDF or EPUB file
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.epub"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      if (!uploadTitle) {
                        setUploadTitle(file.name.replace(/\.(pdf|epub)$/i, ""));
                      }
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="book-title">Title *</Label>
                  <Input
                    id="book-title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Book title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book-author">Author</Label>
                  <Input
                    id="book-author"
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    placeholder="Author name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="book-desc">Description</Label>
                <Textarea
                  id="book-desc"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book-pages">Total Pages</Label>
                  <Input
                    id="book-pages"
                    type="number"
                    value={uploadTotalPages}
                    onChange={(e) => setUploadTotalPages(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeUploadDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading..." : "Upload Book"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        {editBook && (
          <Dialog open={!!editBook} onOpenChange={(open) => !open && setEditBook(null)}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Edit Book</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editBook.title}
                      onChange={(e) => setEditBook({ ...editBook, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input
                      value={editBook.author || ""}
                      onChange={(e) => setEditBook({ ...editBook, author: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editBook.description || ""}
                    onChange={(e) => setEditBook({ ...editBook, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editBook.category}
                      onValueChange={(v) => setEditBook({ ...editBook, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Pages</Label>
                    <Input
                      type="number"
                      value={editBook.totalPages || ""}
                      onChange={(e) =>
                        setEditBook({ ...editBook, totalPages: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditBook(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
