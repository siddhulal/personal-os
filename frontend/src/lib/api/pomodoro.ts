import api from "@/lib/api";
import type { PomodoroSession, PomodoroStats } from "@/types";

export async function fetchPomodoroSessions(): Promise<PomodoroSession[]> {
  const response = await api.get("/api/pomodoro");
  return response.data;
}

export async function fetchPomodoroSessionsByRange(start: string, end: string): Promise<PomodoroSession[]> {
  const response = await api.get(`/api/pomodoro/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  return response.data;
}

export async function createPomodoroSession(data: {
  taskId?: string;
  durationMinutes: number;
  breakMinutes?: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  notes?: string;
}): Promise<PomodoroSession> {
  const response = await api.post("/api/pomodoro", data);
  return response.data;
}

export async function deletePomodoroSession(id: string): Promise<void> {
  await api.delete(`/api/pomodoro/${id}`);
}

export async function fetchPomodoroStats(): Promise<PomodoroStats> {
  const response = await api.get("/api/pomodoro/stats");
  return response.data;
}
