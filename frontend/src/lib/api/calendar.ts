import api from "@/lib/api";
import type { CalendarEvent } from "@/types";

// Backend expects LocalDateTime (no timezone). Strip trailing 'Z' from ISO strings.
function toLocalDateTime(iso: string): string {
  return iso.replace("Z", "").replace(/\.\d{3}$/, "");
}

export async function fetchCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const response = await api.get(
    `/api/calendar?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`
  );
  return response.data;
}

export async function fetchCalendarEvent(id: string): Promise<CalendarEvent> {
  const response = await api.get(`/api/calendar/${id}`);
  return response.data;
}

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  taskId?: string;
  recurrenceRule?: string;
}): Promise<CalendarEvent> {
  const response = await api.post("/api/calendar", data);
  return response.data;
}

export async function updateCalendarEvent(id: string, data: {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  taskId?: string;
  recurrenceRule?: string;
}): Promise<CalendarEvent> {
  const response = await api.put(`/api/calendar/${id}`, data);
  return response.data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await api.delete(`/api/calendar/${id}`);
}
