"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListChecks, GitBranch, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import type { Goal, GoalStatus, GoalTimeframe, PageResponse } from "@/types";

interface GoalFormData {
  title: string;
  description: string;
  status: GoalStatus;
  timeframe: GoalTimeframe;
  targetDate: string;
  progress: number;
}

const emptyFormData: GoalFormData = {
  title: "",
  description: "",
  status: "NOT_STARTED",
  timeframe: "MONTHLY",
  targetDate: "",
  progress: 0,
};

const statusOptions: { value: GoalStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABANDONED", label: "Abandoned" },
];

const timeframeOptions: { value: GoalTimeframe; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "LONG_TERM", label: "Long Term" },
];

function getStatusBadgeClass(status: GoalStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30";
    case "IN_PROGRESS":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30";
    case "COMPLETED":
      return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30";
    case "ABANDONED":
      return "bg-gray-500/15 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-500/30";
    default:
      return "";
  }
}

function getStatusLabel(status: GoalStatus): string {
  const option = statusOptions.find((o) => o.value === status);
  return option ? option.label : status;
}

function getTimeframeLabel(timeframe: GoalTimeframe): string {
  const option = timeframeOptions.find((o) => o.value === timeframe);
  return option ? option.label : timeframe;
}

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(emptyFormData);

  const {
    data: goalsData,
    isLoading,
    isError,
  } = useQuery<PageResponse<Goal>>({
    queryKey: ["goals"],
    queryFn: async () => {
      const response = await api.get("/api/goals");
      return response.data;
    },
  });

  const goals = goalsData?.content ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        timeframe: data.timeframe,
        targetDate: data.targetDate || null,
        progress: data.progress,
      };
      const response = await api.post("/api/goals", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal created successfully");
      handleCloseCreate();
    },
    onError: () => {
      toast.error("Failed to create goal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GoalFormData }) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        timeframe: data.timeframe,
        targetDate: data.targetDate || null,
        progress: data.progress,
      };
      const response = await api.put(`/api/goals/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal updated successfully");
      handleCloseEdit();
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted successfully");
      setDeleteConfirmGoal(null);
    },
    onError: () => {
      toast.error("Failed to delete goal");
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      const payload = {
        title: goal.title,
        description: goal.description,
        status: "COMPLETED" as GoalStatus,
        timeframe: goal.timeframe,
        targetDate: goal.targetDate,
      };
      const response = await api.put(`/api/goals/${goal.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal marked as completed!");
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const goalsRef = useRef(goals);
  goalsRef.current = goals;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Suggest Tasks for Goal",
        action: "suggest_tasks_for_goal",
        icon: ListChecks,
        onAction: () => {
          const activeGoals = goalsRef.current.filter(
            (g) => g.status === "NOT_STARTED" || g.status === "IN_PROGRESS"
          );
          const firstGoal = activeGoals[0];
          const context = firstGoal
            ? `Suggest actionable tasks for this goal:\n\nGoal: ${firstGoal.title}\nDescription: ${firstGoal.description || "N/A"}\nTimeframe: ${getTimeframeLabel(firstGoal.timeframe)}\nProgress: ${firstGoal.progress ?? 0}%\n\nPlease suggest 5-7 concrete, actionable tasks to make progress on this goal.`
            : "I'd like task suggestions for a goal. Please describe your goal.";
          openChat(context);
        },
      },
      {
        label: "Break Down Goal",
        action: "break_down_goal",
        icon: GitBranch,
        onAction: () => {
          const activeGoals = goalsRef.current.filter(
            (g) => g.status === "NOT_STARTED" || g.status === "IN_PROGRESS"
          );
          const firstGoal = activeGoals[0];
          const context = firstGoal
            ? `Break down this goal into smaller sub-goals or milestones:\n\nGoal: ${firstGoal.title}\nDescription: ${firstGoal.description || "N/A"}\nTimeframe: ${getTimeframeLabel(firstGoal.timeframe)}\nTarget Date: ${firstGoal.targetDate || "N/A"}\n\nPlease suggest 3-5 milestones with clear deliverables.`
            : "I'd like to break down a goal into milestones. Please describe your goal.";
          openChat(context);
        },
      },
      {
        label: "Track Progress Advice",
        action: "track_progress_advice",
        icon: TrendingUp,
        onAction: () => {
          const activeGoals = goalsRef.current.filter(
            (g) => g.status === "NOT_STARTED" || g.status === "IN_PROGRESS"
          );
          const goalSummary = activeGoals
            .slice(0, 10)
            .map(
              (g) =>
                `- ${g.title} (${getStatusLabel(g.status)}, ${g.progress ?? 0}% progress, ${getTimeframeLabel(g.timeframe)})`
            )
            .join("\n");
          openChat(
            `Analyze my current goals and provide advice on tracking progress:\n\n${goalSummary || "No active goals found."}\n\nPlease assess my current progress and suggest strategies to stay on track.`
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOpenCreate() {
    setFormData(emptyFormData);
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setFormData(emptyFormData);
  }

  function handleOpenEdit(goal: Goal) {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      status: goal.status,
      timeframe: goal.timeframe,
      targetDate: goal.targetDate || "",
      progress: goal.progress ?? 0,
    });
  }

  function handleCloseEdit() {
    setEditingGoal(null);
    setFormData(emptyFormData);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    createMutation.mutate(formData);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGoal) return;
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    updateMutation.mutate({ id: editingGoal.id, data: formData });
  }

  function handleDeleteConfirm() {
    if (!deleteConfirmGoal) return;
    deleteMutation.mutate(deleteConfirmGoal.id);
  }

  function handleMarkComplete(e: React.MouseEvent, goal: Goal) {
    e.stopPropagation();
    markCompleteMutation.mutate(goal);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
            <p className="text-muted-foreground mt-1">
              Track and achieve your goals
            </p>
          </div>
          <Button onClick={handleOpenCreate}>New Goal</Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-5 bg-muted rounded-full w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="h-8 bg-muted rounded w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Failed to load goals.</p>
            <p className="text-muted-foreground mt-1">
              Please try refreshing the page.
            </p>
          </div>
        )}

        {!isLoading && !isError && goals.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">No goals yet</h3>
            <p className="text-muted-foreground mt-1">
              Create your first goal and start tracking your progress.
            </p>
            <Button onClick={handleOpenCreate} className="mt-4">
              New Goal
            </Button>
          </div>
        )}

        {!isLoading && !isError && goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <Card
                key={goal.id}
                className="cursor-pointer hover:shadow-md transition-shadow flex flex-col"
                onClick={() => handleOpenEdit(goal)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-2">
                      {goal.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(goal.status)}
                    >
                      {getStatusLabel(goal.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 flex-1">
                  {goal.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {goal.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {goal.timeframe && (
                      <Badge variant="secondary" className="text-xs">
                        {getTimeframeLabel(goal.timeframe)}
                      </Badge>
                    )}
                    {goal.targetDate && (
                      <span className="text-xs text-muted-foreground">
                        Target: {formatDate(goal.targetDate)}
                      </span>
                    )}
                  </div>
                  {goal.tags && goal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {goal.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {goal.progress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 flex items-center gap-2">
                  {goal.status !== "COMPLETED" &&
                    goal.status !== "ABANDONED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleMarkComplete(e, goal)}
                        disabled={markCompleteMutation.isPending}
                      >
                        Mark Complete
                      </Button>
                    )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(goal);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmGoal(goal);
                    }}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>New Goal</DialogTitle>
                <DialogDescription>
                  Define a new goal to track your progress.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-goal-title">Title</Label>
                  <Input
                    id="create-goal-title"
                    placeholder="Goal title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-goal-description">Description</Label>
                  <Textarea
                    id="create-goal-description"
                    placeholder="Describe your goal..."
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: GoalStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Timeframe</Label>
                    <Select
                      value={formData.timeframe}
                      onValueChange={(value: GoalTimeframe) =>
                        setFormData({ ...formData, timeframe: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-goal-target-date">Target Date</Label>
                  <Input
                    id="create-goal-target-date"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-goal-progress">
                    Progress: {formData.progress}%
                  </Label>
                  <input
                    id="create-goal-progress"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.progress}
                    onChange={(e) =>
                      setFormData({ ...formData, progress: Number(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseCreate}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editingGoal !== null}
          onOpenChange={(open) => {
            if (!open) handleCloseEdit();
          }}
        >
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Goal</DialogTitle>
                <DialogDescription>
                  Update your goal details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-goal-title">Title</Label>
                  <Input
                    id="edit-goal-title"
                    placeholder="Goal title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-goal-description">Description</Label>
                  <Textarea
                    id="edit-goal-description"
                    placeholder="Describe your goal..."
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: GoalStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Timeframe</Label>
                    <Select
                      value={formData.timeframe}
                      onValueChange={(value: GoalTimeframe) =>
                        setFormData({ ...formData, timeframe: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-goal-target-date">Target Date</Label>
                  <Input
                    id="edit-goal-target-date"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-goal-progress">
                    Progress: {formData.progress}%
                  </Label>
                  <input
                    id="edit-goal-progress"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.progress}
                    onChange={(e) =>
                      setFormData({ ...formData, progress: Number(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    if (editingGoal) {
                      setDeleteConfirmGoal(editingGoal);
                      handleCloseEdit();
                    }
                  }}
                >
                  Delete
                </Button>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteConfirmGoal !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmGoal(null);
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Goal</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmGoal?.title}
                &quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmGoal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
