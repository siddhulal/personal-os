import api from "@/lib/api";
import type { AiGenerateResponse } from "@/types";

export async function generateFlashcardsFromNote(noteId: string): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/flashcards-from-note/${noteId}`);
  return response.data;
}

export async function summarizeProject(projectId: string): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/summarize-project/${projectId}`);
  return response.data;
}

export async function generateWeeklyReview(): Promise<AiGenerateResponse> {
  const response = await api.post("/api/ai/generate/weekly-review");
  return response.data;
}

export async function suggestTasksFromGoal(goalId: string): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/suggest-tasks/${goalId}`);
  return response.data;
}
