"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  MoreHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Task, TaskStatus, TaskPriority, PageResponse } from "@/types";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  URGENT: { label: "Urgent", className: "bg-red-600 text-white hover:bg-red-600/80 border-transparent" },
  HIGH: { label: "High", className: "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border-transparent" },
  MEDIUM: { label: "Medium", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25 border-transparent" },
  LOW: { label: "Low", className: "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-transparent" },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string }> = {
  TODO: { label: "Todo" },
  IN_PROGRESS: { label: "In Progress" },
  DONE: { label: "Done" },
  ARCHIVED: { label: "Archived" },
};

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

const EMPTY_FORM: TaskFormData = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  dueDate: "",
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-border animate-pulse"
        >
          <div className="h-5 w-5 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(EMPTY_FORM);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const pageSize = 20;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("size", String(pageSize));
  if (statusFilter !== "ALL") {
    queryParams.set("status", statusFilter);
  }
  if (priorityFilter !== "ALL") {
    queryParams.set("priority", priorityFilter);
  }

  const {
    data: taskPage,
    isLoading,
    isError,
    error,
  } = useQuery<PageResponse<Task>>({
    queryKey: ["tasks", page, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await api.get(`/api/tasks?${queryParams.toString()}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await api.post("/api/tasks", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await api.put(`/api/tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: TaskStatus }) => {
      const newStatus: TaskStatus = currentStatus === "DONE" ? "TODO" : "DONE";
      const task = tasks.find((t) => t.id === id);
      const res = await api.put(`/api/tasks/${id}`, {
        title: task?.title ?? "Untitled",
        description: task?.description ?? null,
        priority: task?.priority ?? "MEDIUM",
        status: newStatus,
        dueDate: task?.dueDate ?? null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast.error("Failed to update task status");
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setFormData(EMPTY_FORM);
    setEditingTaskId(null);
  }

  function openEditDialog(task: Task) {
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setEditingTaskId(task.id);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate || null,
    };

    if (editingTaskId) {
      updateMutation.mutate({ id: editingTaskId, data: payload as Partial<Task> });
    } else {
      createMutation.mutate(payload as Partial<Task>);
    }
  }

  const tasks = taskPage?.content ?? [];
  const totalPages = taskPage?.totalPages ?? 0;
  const totalElements = taskPage?.totalElements ?? 0;
  const isFirstPage = (taskPage?.page ?? 0) === 0;
  const isLastPage = taskPage?.last ?? true;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalElements > 0
                ? `${totalElements} task${totalElements !== 1 ? "s" : ""}`
                : "Manage your tasks"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) closeDialog();
            else {
              setFormData(EMPTY_FORM);
              setEditingTaskId(null);
              setDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTaskId ? "Edit Task" : "Create New Task"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    placeholder="Enter task title..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    placeholder="Add a description..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          priority: value as TaskPriority,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: value as TaskStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">Todo</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Due Date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isMutating}>
                    {isMutating && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingTaskId ? "Save Changes" : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="TODO">Todo</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(value) => {
              setPriorityFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task list */}
        {isLoading ? (
          <TaskSkeleton />
        ) : isError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">
                Failed to load tasks
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                {statusFilter !== "ALL" || priorityFilter !== "ALL"
                  ? "Try adjusting your filters to see more tasks."
                  : "Create your first task to get started."}
              </p>
              {statusFilter === "ALL" && priorityFilter === "ALL" && (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setFormData(EMPTY_FORM);
                    setEditingTaskId(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate) && task.status !== "DONE";
              const isDone = task.status === "DONE";

              return (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-colors"
                >
                  {/* Toggle checkbox */}
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        id: task.id,
                        currentStatus: task.status,
                      })
                    }
                    aria-label={isDone ? "Mark as todo" : "Mark as done"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium truncate ${
                          isDone
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.status === "IN_PROGRESS" && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-blue-500/30 text-blue-500">
                          In Progress
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Project name */}
                      {task.projectName && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <FolderKanban className="h-3 w-3" />
                          {task.projectName}
                        </span>
                      )}

                      {/* Due date */}
                      {task.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            overdue
                              ? "text-red-500 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {overdue ? "Overdue" : formatDate(task.dueDate)}
                        </span>
                      )}

                      {/* Tags */}
                      {task.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Priority badge */}
                  <Badge
                    className={`shrink-0 text-xs px-2 py-0 h-5 ${
                      PRIORITY_CONFIG[task.priority].className
                    }`}
                  >
                    {PRIORITY_CONFIG[task.priority].label}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openEditDialog(task)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            id: task.id,
                            currentStatus: task.status,
                          })
                        }
                      >
                        {isDone ? "Mark as Todo" : "Mark as Done"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFirstPage}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isLastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
