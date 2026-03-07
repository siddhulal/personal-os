"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/api/calendar";
import type { CalendarEvent, Task, PageResponse } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESET_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#06b6d4", label: "Cyan" },
];

const CATEGORIES = [
  "GENERAL",
  "WORK",
  "PERSONAL",
  "HEALTH",
  "LEARNING",
  "SOCIAL",
  "MEETING",
  "DEADLINE",
];

interface EventFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string;
  category: string;
  taskId: string;
}

const EMPTY_FORM: EventFormData = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  allDay: false,
  color: "#6366f1",
  category: "GENERAL",
  taskId: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildCalendarGrid(currentMonth: Date) {
  const first = startOfMonth(currentMonth);
  const last = endOfMonth(currentMonth);
  const startDay = first.getDay(); // 0=Sun
  const totalDays = last.getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];

  // Leading days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i - 1);
    cells.push({ date: d, inMonth: false });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    cells.push({
      date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d),
      inMonth: true,
    });
  }

  // Trailing days to fill the grid (ensure 6 rows = 42 cells for consistency)
  while (cells.length < 42) {
    const lastCell = cells[cells.length - 1].date;
    const next = new Date(lastCell);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");

  // Compute visible range for fetching events (include overflow days)
  const gridCells = useMemo(() => buildCalendarGrid(currentMonth), [currentMonth]);
  const rangeStart = gridCells[0].date;
  const rangeEnd = gridCells[gridCells.length - 1].date;
  const rangeStartISO = rangeStart.toISOString();
  const rangeEndISO = new Date(
    rangeEnd.getFullYear(),
    rangeEnd.getMonth(),
    rangeEnd.getDate(),
    23,
    59,
    59
  ).toISOString();

  // ---- Queries ----

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
  } = useQuery<CalendarEvent[]>({
    queryKey: ["calendarEvents", rangeStartISO, rangeEndISO],
    queryFn: () => fetchCalendarEvents(rangeStartISO, rangeEndISO),
  });

  const { data: tasksPage } = useQuery<PageResponse<Task>>({
    queryKey: ["tasks", "calendarLink"],
    queryFn: async () => {
      const res = await api.get("/api/tasks?size=200&status=TODO&status=IN_PROGRESS");
      return res.data;
    },
  });

  const tasks = tasksPage?.content ?? [];

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createCalendarEvent>[0]) =>
      createCalendarEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      toast.success("Event created");
      closeDialog();
    },
    onError: () => toast.error("Failed to create event"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCalendarEvent>[1] }) =>
      updateCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      toast.success("Event updated");
      closeDialog();
    },
    onError: () => toast.error("Failed to update event"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });

  // ---- Handlers ----

  function closeDialog() {
    setDialogOpen(false);
    setFormData(EMPTY_FORM);
    setEditingEventId(null);
  }

  function openCreateDialog(date?: Date) {
    const d = date ?? selectedDate;
    const start = new Date(d);
    start.setHours(9, 0, 0, 0);
    const end = new Date(d);
    end.setHours(10, 0, 0, 0);

    setFormData({
      ...EMPTY_FORM,
      startTime: toLocalDatetimeString(start),
      endTime: toLocalDatetimeString(end),
    });
    setEditingEventId(null);
    setDialogOpen(true);
  }

  function openEditDialog(event: CalendarEvent) {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 3600000);

    setFormData({
      title: event.title,
      description: event.description ?? "",
      startTime: event.allDay ? toLocalDateString(start) : toLocalDatetimeString(start),
      endTime: event.allDay ? toLocalDateString(end) : toLocalDatetimeString(end),
      allDay: event.allDay,
      color: event.color ?? "#6366f1",
      category: event.category,
      taskId: event.taskId ?? "",
    });
    setEditingEventId(event.id);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      startTime: formData.allDay
        ? new Date(formData.startTime + "T00:00:00").toISOString()
        : new Date(formData.startTime).toISOString(),
      endTime: formData.endTime
        ? formData.allDay
          ? new Date(formData.endTime + "T23:59:59").toISOString()
          : new Date(formData.endTime).toISOString()
        : undefined,
      allDay: formData.allDay,
      color: formData.color || undefined,
      category: formData.category,
      taskId: formData.taskId || undefined,
    };

    if (editingEventId) {
      updateMutation.mutate({ id: editingEventId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function navigateMonth(delta: number) {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  function goToToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  // ---- Derived data ----

  const eventsForDate = (date: Date) =>
    events.filter((ev) => isSameDay(new Date(ev.startTime), date));

  const selectedDayEvents = eventsForDate(selectedDate).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Plan My Week",
        action: "plan_week",
        icon: Calendar,
        onAction: () => {
          const upcoming = eventsRef.current.slice(0, 15)
            .map((e) => `- ${e.title} (${new Date(e.startTime).toLocaleDateString()} ${new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`)
            .join("\n");
          openChat(
            `Help me plan my week. Here are my upcoming events:\n\n${upcoming || "No events scheduled."}\n\nSuggest time blocks for focused work, meetings, and breaks. Identify any gaps I could use productively.`
          );
        },
      },
      {
        label: "Suggest Schedule",
        action: "suggest_schedule",
        icon: Clock,
        onAction: () => {
          openChat(
            "I need help organizing my schedule. Based on productivity best practices, suggest an ideal daily schedule template with time blocks for deep work, meetings, exercise, and breaks. I can then create events based on your suggestion."
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Render ----

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule and manage your events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViewMode(viewMode === "calendar" ? "agenda" : "calendar")
              }
            >
              {viewMode === "calendar" ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Agenda
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => openCreateDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold w-48 text-center">
              {formatMonthYear(currentMonth)}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="ml-2">
              Today
            </Button>
          </div>
        </div>

        {/* Calendar grid or Agenda view */}
        {eventsError ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Failed to load calendar events.</p>
            <p className="text-sm mt-1">Please try refreshing the page.</p>
          </div>
        ) : viewMode === "calendar" ? (
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted/50">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7">
              {gridCells.map((cell, idx) => {
                const cellEvents = eventsForDate(cell.date);
                const isToday = isSameDay(cell.date, today);
                const isSelected = isSameDay(cell.date, selectedDate);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    className={`
                      relative min-h-[5.5rem] p-1.5 text-left border-b border-r border-border
                      transition-colors hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-primary/40
                      ${!cell.inMonth ? "bg-muted/30" : "bg-background"}
                      ${isSelected ? "ring-2 ring-primary/50 bg-primary/5" : ""}
                    `}
                  >
                    <span
                      className={`
                        inline-flex items-center justify-center text-sm w-7 h-7 rounded-full
                        ${isToday ? "bg-primary text-primary-foreground font-bold" : ""}
                        ${!cell.inMonth ? "text-muted-foreground/50" : "text-foreground"}
                      `}
                    >
                      {cell.date.getDate()}
                    </span>

                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {cellEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[11px] leading-tight truncate rounded px-1 py-[1px] text-white font-medium"
                          style={{ backgroundColor: ev.color ?? "#6366f1" }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {cellEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{cellEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Agenda view */
          <div className="space-y-2">
            {eventsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading events...
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No events on{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => openCreateDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: ev.color ?? "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ev.allDay
                        ? "All day"
                        : `${formatTime(ev.startTime)}${ev.endTime ? ` - ${formatTime(ev.endTime)}` : ""}`}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {ev.category}
                      </Badge>
                      {ev.taskTitle && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {ev.taskTitle}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(ev)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(ev.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected day panel (shown below calendar grid) */}
        {viewMode === "calendar" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateDialog(selectedDate)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>

            {eventsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border animate-pulse"
                  >
                    <div className="w-1 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-1/3 rounded bg-muted" />
                      <div className="h-3 w-1/5 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed border-border">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No events scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: ev.color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {ev.allDay
                            ? "All day"
                            : `${formatTime(ev.startTime)}${ev.endTime ? ` - ${formatTime(ev.endTime)}` : ""}`}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {ev.category}
                        </Badge>
                        {ev.taskTitle && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {ev.taskTitle}
                          </Badge>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(ev)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(ev.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>
                {editingEventId ? "Edit Event" : "Create New Event"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  placeholder="Event title..."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="event-desc">Description</Label>
                <Textarea
                  id="event-desc"
                  placeholder="Add details..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>

              {/* All day toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.allDay}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, allDay: !prev.allDay }))
                  }
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${formData.allDay ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0
                      transition-transform ${formData.allDay ? "translate-x-4" : "translate-x-0"}
                    `}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setFormData((prev) => ({ ...prev, allDay: !prev.allDay }))}>
                  All day
                </Label>
              </div>

              {/* Date / Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start">
                    {formData.allDay ? "Start Date" : "Start"}
                  </Label>
                  <Input
                    id="event-start"
                    type={formData.allDay ? "date" : "datetime-local"}
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end">
                    {formData.allDay ? "End Date" : "End"}
                  </Label>
                  <Input
                    id="event-end"
                    type={formData.allDay ? "date" : "datetime-local"}
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color: c.value }))
                      }
                      className={`
                        w-7 h-7 rounded-full border-2 transition-all
                        ${formData.color === c.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"}
                      `}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Category & Task link */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Link to Task</Label>
                  <Select
                    value={formData.taskId || "__none__"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        taskId: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {editingEventId ? "Save Changes" : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
