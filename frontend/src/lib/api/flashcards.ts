import api from "@/lib/api";
import type { Flashcard, FlashcardStats, FlashcardRating, PageResponse } from "@/types";

export async function fetchFlashcards(page = 0, size = 50): Promise<PageResponse<Flashcard>> {
  const response = await api.get(`/api/flashcards?page=${page}&size=${size}`);
  return response.data;
}

export async function fetchFlashcardsByDeck(deck: string, page = 0, size = 50): Promise<PageResponse<Flashcard>> {
  const response = await api.get(`/api/flashcards/deck/${encodeURIComponent(deck)}?page=${page}&size=${size}`);
  return response.data;
}

export async function fetchFlashcard(id: string): Promise<Flashcard> {
  const response = await api.get(`/api/flashcards/${id}`);
  return response.data;
}

export async function createFlashcard(data: {
  front: string;
  back: string;
  deck?: string;
  noteId?: string;
}): Promise<Flashcard> {
  const response = await api.post("/api/flashcards", data);
  return response.data;
}

export async function updateFlashcard(id: string, data: {
  front: string;
  back: string;
  deck?: string;
}): Promise<Flashcard> {
  const response = await api.put(`/api/flashcards/${id}`, data);
  return response.data;
}

export async function deleteFlashcard(id: string): Promise<void> {
  await api.delete(`/api/flashcards/${id}`);
}

export async function fetchDueCards(deck?: string): Promise<Flashcard[]> {
  const params = deck ? `?deck=${encodeURIComponent(deck)}` : "";
  const response = await api.get(`/api/flashcards/due${params}`);
  return response.data;
}

export async function reviewFlashcard(id: string, rating: FlashcardRating): Promise<Flashcard> {
  const response = await api.post(`/api/flashcards/${id}/review`, { rating });
  return response.data;
}

export async function fetchFlashcardStats(): Promise<FlashcardStats> {
  const response = await api.get("/api/flashcards/stats");
  return response.data;
}
