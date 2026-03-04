import api from "@/lib/api";
import type { Habit, HabitCompletion, HabitStats, HabitInsights } from "@/types";

export async function fetchHabits(): Promise<Habit[]> {
  const response = await api.get("/api/habits");
  return response.data;
}

export async function fetchAllHabits(): Promise<Habit[]> {
  const response = await api.get("/api/habits/all");
  return response.data;
}

export async function fetchTodayHabits(): Promise<Habit[]> {
  const response = await api.get("/api/habits/today");
  return response.data;
}

export async function fetchHabit(id: string): Promise<Habit> {
  const response = await api.get(`/api/habits/${id}`);
  return response.data;
}

export async function createHabit(data: {
  name: string;
  description?: string;
  frequency?: string;
  frequencyDays?: number[];
  category?: string;
  color?: string;
  icon?: string;
  isMicroHabit?: boolean;
  microHabitCue?: string;
  targetCount?: number;
}): Promise<Habit> {
  const response = await api.post("/api/habits", data);
  return response.data;
}

export async function updateHabit(
  id: string,
  data: {
    name: string;
    description?: string;
    frequency?: string;
    frequencyDays?: number[];
    category?: string;
    color?: string;
    icon?: string;
    isMicroHabit?: boolean;
    microHabitCue?: string;
    targetCount?: number;
  }
): Promise<Habit> {
  const response = await api.put(`/api/habits/${id}`, data);
  return response.data;
}

export async function deleteHabit(id: string): Promise<void> {
  await api.delete(`/api/habits/${id}`);
}

export async function toggleHabitCompletion(
  id: string,
  date?: string
): Promise<HabitCompletion | null> {
  const params = date ? `?date=${date}` : "";
  const response = await api.post(`/api/habits/${id}/toggle${params}`);
  return response.data || null;
}

export async function fetchCompletions(
  id: string,
  start: string,
  end: string
): Promise<HabitCompletion[]> {
  const response = await api.get(
    `/api/habits/${id}/completions?start=${start}&end=${end}`
  );
  return response.data;
}

export async function fetchHabitStats(id: string): Promise<HabitStats> {
  const response = await api.get(`/api/habits/${id}/stats`);
  return response.data;
}

export async function fetchHabitInsights(): Promise<HabitInsights> {
  const response = await api.get("/api/habits/insights");
  return response.data;
}
