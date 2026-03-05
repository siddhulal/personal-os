import api from "@/lib/api";
import type { Tag } from "@/types";

export async function fetchTags(): Promise<Tag[]> {
  const response = await api.get("/api/tags");
  return response.data;
}

export async function createTag(data: { name: string; color: string }): Promise<Tag> {
  const response = await api.post("/api/tags", data);
  return response.data;
}

export async function updateTag(id: string, data: { name: string; color: string }): Promise<Tag> {
  const response = await api.put(`/api/tags/${id}`, data);
  return response.data;
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/api/tags/${id}`);
}
