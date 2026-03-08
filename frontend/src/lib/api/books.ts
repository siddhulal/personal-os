import api from "@/lib/api";
import type {
  Book,
  BookHighlight,
  BookBookmark,
  BookStats,
  PageResponse,
  AiGenerateResponse,
} from "@/types";

// ==================== BOOKS CRUD ====================

export async function fetchBooks(params?: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Book>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page !== undefined) searchParams.set("page", String(params.page));
  if (params?.size !== undefined) searchParams.set("size", String(params.size));
  const qs = searchParams.toString();
  const response = await api.get(`/api/books${qs ? `?${qs}` : ""}`);
  return response.data;
}

export async function fetchBook(id: string): Promise<Book> {
  const response = await api.get(`/api/books/${id}`);
  return response.data;
}

export async function uploadBook(formData: FormData): Promise<Book> {
  const response = await api.post("/api/books", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateBook(
  id: string,
  data: {
    title?: string;
    author?: string;
    description?: string;
    category?: string;
    totalPages?: number;
    tagIds?: string[];
  }
): Promise<Book> {
  const response = await api.put(`/api/books/${id}`, data);
  return response.data;
}

export async function deleteBook(id: string): Promise<void> {
  await api.delete(`/api/books/${id}`);
}

export async function updateBookProgress(
  id: string,
  currentPage: number
): Promise<Book> {
  const response = await api.patch(`/api/books/${id}/progress`, { currentPage });
  return response.data;
}

export async function updateBookRating(
  id: string,
  rating: number
): Promise<Book> {
  const response = await api.patch(`/api/books/${id}/rating`, { rating });
  return response.data;
}

export async function updateBookStatus(
  id: string,
  status: string
): Promise<Book> {
  const response = await api.patch(`/api/books/${id}/status`, { status });
  return response.data;
}

export async function fetchBookStats(): Promise<BookStats> {
  const response = await api.get("/api/books/stats");
  return response.data;
}

// ==================== HIGHLIGHTS ====================

export async function fetchHighlights(bookId: string): Promise<BookHighlight[]> {
  const response = await api.get(`/api/books/${bookId}/highlights`);
  return response.data;
}

export async function createHighlight(
  bookId: string,
  data: {
    pageNumber: number;
    selectedText: string;
    aiResponse?: string;
    aiActionType?: string;
    color?: string;
    note?: string;
  }
): Promise<BookHighlight> {
  const response = await api.post(`/api/books/${bookId}/highlights`, data);
  return response.data;
}

export async function updateHighlight(
  bookId: string,
  highlightId: string,
  data: { note?: string; color?: string; aiResponse?: string }
): Promise<BookHighlight> {
  const response = await api.put(
    `/api/books/${bookId}/highlights/${highlightId}`,
    data
  );
  return response.data;
}

export async function deleteHighlight(
  bookId: string,
  highlightId: string
): Promise<void> {
  await api.delete(`/api/books/${bookId}/highlights/${highlightId}`);
}

// ==================== BOOKMARKS ====================

export async function fetchBookmarks(bookId: string): Promise<BookBookmark[]> {
  const response = await api.get(`/api/books/${bookId}/bookmarks`);
  return response.data;
}

export async function createBookmark(
  bookId: string,
  pageNumber: number,
  label?: string
): Promise<BookBookmark> {
  const response = await api.post(`/api/books/${bookId}/bookmarks`, {
    pageNumber,
    label,
  });
  return response.data;
}

export async function deleteBookmark(
  bookId: string,
  bookmarkId: string
): Promise<void> {
  await api.delete(`/api/books/${bookId}/bookmarks/${bookmarkId}`);
}

// ==================== AI ACTIONS ====================

export async function bookAiAction(
  bookId: string,
  data: {
    selectedText: string;
    pageNumber: number;
    actionType: string;
    question?: string;
    language?: string;
  }
): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/books/${bookId}/ai`, data);
  return response.data;
}
