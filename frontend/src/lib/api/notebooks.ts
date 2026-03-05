import api from "@/lib/api";
import type { Notebook, Section, Note, NoteLink, NoteGraph, NoteSuggestion } from "@/types";

// Notebooks
export async function fetchNotebooks(): Promise<Notebook[]> {
  const response = await api.get("/api/notebooks");
  return response.data;
}

export async function fetchNotebook(id: string): Promise<Notebook> {
  const response = await api.get(`/api/notebooks/${id}`);
  return response.data;
}

export async function createNotebook(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<Notebook> {
  const response = await api.post("/api/notebooks", data);
  return response.data;
}

export async function updateNotebook(
  id: string,
  data: { name: string; description?: string; color?: string; icon?: string }
): Promise<Notebook> {
  const response = await api.put(`/api/notebooks/${id}`, data);
  return response.data;
}

export async function deleteNotebook(id: string): Promise<void> {
  await api.delete(`/api/notebooks/${id}`);
}

// Default/named notebook (get or create)
export async function getOrCreateDefaultNotebook(name: string = "Learning Notes"): Promise<Notebook> {
  const response = await api.post(`/api/notebooks/default?name=${encodeURIComponent(name)}`);
  return response.data;
}

// Sections
export async function fetchSections(notebookId: string): Promise<Section[]> {
  const response = await api.get(`/api/notebooks/${notebookId}/sections`);
  return response.data;
}

export async function createSection(
  notebookId: string,
  data: { name: string }
): Promise<Section> {
  const response = await api.post(
    `/api/notebooks/${notebookId}/sections`,
    data
  );
  return response.data;
}

export async function updateSection(
  id: string,
  data: { name: string }
): Promise<Section> {
  const response = await api.put(`/api/sections/${id}`, data);
  return response.data;
}

export async function deleteSection(id: string): Promise<void> {
  await api.delete(`/api/sections/${id}`);
}

// Pages (notes within a section)
export async function fetchPages(sectionId: string): Promise<Note[]> {
  const response = await api.get(`/api/sections/${sectionId}/pages`);
  return response.data;
}

export async function fetchPage(id: string): Promise<Note> {
  const response = await api.get(`/api/notes/${id}`);
  return response.data;
}

export async function createPage(data: {
  title: string;
  content?: string;
  contentJson?: string;
  notebookId?: string;
  sectionId?: string;
}): Promise<Note> {
  const response = await api.post("/api/notes", data);
  return response.data;
}

export async function updatePage(
  id: string,
  data: {
    title?: string;
    content?: string;
    contentJson?: string;
    notebookId?: string;
    sectionId?: string;
    orderIndex?: number;
  }
): Promise<Note> {
  const response = await api.put(`/api/notes/${id}`, data);
  return response.data;
}

export async function deletePage(id: string): Promise<void> {
  await api.delete(`/api/notes/${id}`);
}

export async function searchNotes(query: string): Promise<Note[]> {
  const response = await api.get(`/api/notes/search?q=${encodeURIComponent(query)}`);
  return response.data;
}

// Daily Notes
export async function getOrCreateDailyNote(date?: string): Promise<Note> {
  const params = date ? `?date=${date}` : "";
  const response = await api.post(`/api/notes/daily${params}`);
  return response.data;
}

// Note Links
export async function createNoteLink(sourceId: string, targetNoteId: string): Promise<NoteLink> {
  const response = await api.post(`/api/notes/${sourceId}/links`, { targetNoteId });
  return response.data;
}

export async function syncNoteLinks(sourceId: string, targetIds: string[]): Promise<void> {
  await api.put(`/api/notes/${sourceId}/links/sync`, targetIds);
}

export async function deleteNoteLink(sourceId: string, targetId: string): Promise<void> {
  await api.delete(`/api/notes/${sourceId}/links/${targetId}`);
}

export async function fetchBacklinks(noteId: string): Promise<NoteLink[]> {
  const response = await api.get(`/api/notes/${noteId}/backlinks`);
  return response.data;
}

// Knowledge Graph
export async function fetchNoteGraph(): Promise<NoteGraph> {
  const response = await api.get("/api/notes/graph");
  return response.data;
}

// Note Suggestions (for wiki link autocomplete)
export async function suggestNotes(query: string): Promise<NoteSuggestion[]> {
  const response = await api.get(`/api/notes/suggest?q=${encodeURIComponent(query)}`);
  return response.data;
}

// Related Notes
export async function fetchRelatedNotes(noteId: string): Promise<Note[]> {
  const response = await api.get(`/api/notes/${noteId}/related`);
  return response.data;
}

// Auto-Link Suggestions
export async function fetchAutoLinkSuggestions(noteId: string): Promise<NoteSuggestion[]> {
  const response = await api.get(`/api/notes/${noteId}/auto-link-suggestions`);
  return response.data;
}
