import api from "@/lib/api";
import type { NoteTemplate } from "@/types";

export async function fetchTemplates(): Promise<NoteTemplate[]> {
  const response = await api.get("/api/note-templates");
  return response.data;
}

export async function fetchTemplate(id: string): Promise<NoteTemplate> {
  const response = await api.get(`/api/note-templates/${id}`);
  return response.data;
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  content?: string;
  contentJson?: string;
  category?: string;
  icon?: string;
}): Promise<NoteTemplate> {
  const response = await api.post("/api/note-templates", data);
  return response.data;
}

export async function updateTemplate(id: string, data: {
  name: string;
  description?: string;
  content?: string;
  contentJson?: string;
  category?: string;
  icon?: string;
}): Promise<NoteTemplate> {
  const response = await api.put(`/api/note-templates/${id}`, data);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/api/note-templates/${id}`);
}
