import api from "@/lib/api";
import type { NoteVersion } from "@/types";

export async function fetchVersions(noteId: string): Promise<NoteVersion[]> {
  const response = await api.get(`/api/notes/${noteId}/versions`);
  return response.data;
}

export async function fetchVersion(noteId: string, versionId: string): Promise<NoteVersion> {
  const response = await api.get(`/api/notes/${noteId}/versions/${versionId}`);
  return response.data;
}

export async function createVersion(noteId: string): Promise<NoteVersion> {
  const response = await api.post(`/api/notes/${noteId}/versions`);
  return response.data;
}

export async function restoreVersion(noteId: string, versionId: string): Promise<NoteVersion> {
  const response = await api.post(`/api/notes/${noteId}/versions/${versionId}/restore`);
  return response.data;
}
