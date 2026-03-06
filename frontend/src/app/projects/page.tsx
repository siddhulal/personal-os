"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  MoreHorizontal,
  Trash2,
  CheckSquare,
  Calendar,
  Loader2,
  AlertCircle,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Project, ProjectStatus, PageResponse } from "@/types";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  PLANNING: {
    label: "Planning",
    className:
      "bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 border-transparent",
  },
  ACTIVE: {
    label: "Active",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border-transparent",
  },
  ON_HOLD: {
    label: "On Hold",
    className:
      "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25 border-transparent",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-transparent",
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-gray-500/15 text-gray-500 dark:text-gray-400 hover:bg-gray-500/25 border-transparent",
  },
};

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  targetDate: string;
}

const EMPTY_FORM: ProjectFormData = {
  name: "",
  description: "",
  status: "PLANNING",
  startDate: "",
  targetDate: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-2/5 rounded bg-muted" />
                <div className="h-4 w-3/5 rounded bg-muted" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-2 w-full rounded bg-muted" />
              <div className="flex gap-4">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null);

  const pageSize = 20;

  const {
    data: projectPage,
    isLoading,
    isError,
    error,
  } = useQuery<PageResponse<Project>>({
    queryKey: ["projects", page],
    queryFn: async () => {
      const res = await api.get(
        `/api/projects?page=${page}&size=${pageSize}`
      );
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const res = await api.post("/api/projects", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to create project");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Project>;
    }) => {
      const res = await api.put(`/api/projects/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setFormData(EMPTY_FORM);
    setEditingProjectId(null);
  }

  function openEditDialog(project: Project) {
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      targetDate: project.targetDate ? project.targetDate.split("T")[0] : "",
    });
    setEditingProjectId(project.id);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      startDate: formData.startDate || null,
      targetDate: formData.targetDate || null,
    };

    if (editingProjectId) {
      updateMutation.mutate({
        id: editingProjectId,
        data: payload as Partial<Project>,
      });
    } else {
      createMutation.mutate(payload as Partial<Project>);
    }
  }

  function toggleExpanded(projectId: string) {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
  }

  const projects = (projectPage?.content ?? []).map((p) => ({
    ...p,
    tags: p.tags ?? [],
    taskCount: p.taskCount ?? 0,
    completedTaskCount: p.completedTaskCount ?? 0,
  }));
  const totalPages = projectPage?.totalPages ?? 0;
  const totalElements = projectPage?.totalElements ?? 0;
  const isFirstPage = (projectPage?.page ?? 0) === 0;
  const isLastPage = projectPage?.last ?? true;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalElements > 0
                ? `${totalElements} project${totalElements !== 1 ? "s" : ""}`
                : "Organize your work into projects"}
            </p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) closeDialog();
              else {
                setFormData(EMPTY_FORM);
                setEditingProjectId(null);
                setDialogOpen(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingProjectId ? "Edit Project" : "Create New Project"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name..."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Describe the project..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: value as ProjectStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-start-date">Start Date</Label>
                    <Input
                      id="project-start-date"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-target-date">Target Date</Label>
                    <Input
                      id="project-target-date"
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetDate: e.target.value,
                        }))
                      }
                    />
                  </div>
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
                    {editingProjectId ? "Save Changes" : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project grid */}
        {isLoading ? (
          <ProjectSkeleton />
        ) : isError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">
                Failed to load projects
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FolderKanban className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No projects yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                Projects help you organize related tasks and track progress.
                Create your first project to get started.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFormData(EMPTY_FORM);
                  setEditingProjectId(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              const taskProgress =
                project.taskCount > 0
                  ? Math.round(
                      (project.completedTaskCount / project.taskCount) * 100
                    )
                  : 0;

              return (
                <Card
                  key={project.id}
                  className="group hover:border-foreground/20 transition-colors cursor-pointer"
                  onClick={() => toggleExpanded(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <CardDescription
                            className={`mt-1 text-sm ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`text-xs px-2 py-0 h-5 ${
                            STATUS_CONFIG[project.status].className
                          }`}
                        >
                          {STATUS_CONFIG[project.status].label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(project);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteProject(project);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {/* Task progress */}
                    {project.taskCount > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>
                            {project.completedTaskCount} / {project.taskCount}{" "}
                            tasks
                          </span>
                        </div>
                        <Progress value={taskProgress} className="h-1.5" />
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {project.taskCount} task
                        {project.taskCount !== 1 ? "s" : ""}
                      </span>
                      {project.targetDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Target: {formatDate(project.targetDate)}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {project.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <CardFooter className="flex-col items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 w-full">
                        <div>
                          <span className="font-medium text-foreground">
                            Status:
                          </span>{" "}
                          {STATUS_CONFIG[project.status].label}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Tasks:
                          </span>{" "}
                          {project.completedTaskCount}/{project.taskCount}{" "}
                          completed
                        </div>
                        {project.startDate && (
                          <div>
                            <span className="font-medium text-foreground">
                              Started:
                            </span>{" "}
                            {formatDate(project.startDate)}
                          </div>
                        )}
                        {project.targetDate && (
                          <div>
                            <span className="font-medium text-foreground">
                              Target:
                            </span>{" "}
                            {formatDate(project.targetDate)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground">
                            Created:
                          </span>{" "}
                          {formatDate(project.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Updated:
                          </span>{" "}
                          {formatDate(project.updatedAt)}
                        </div>
                      </div>
                    </CardFooter>
                  )}
                </Card>
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

        <ConfirmDialog
          open={!!confirmDeleteProject}
          onOpenChange={(open) => { if (!open) setConfirmDeleteProject(null); }}
          title="Delete Project"
          description={`Are you sure you want to delete "${confirmDeleteProject?.name}"? This action cannot be undone.`}
          onConfirm={() => {
            if (confirmDeleteProject) {
              deleteMutation.mutate(confirmDeleteProject.id);
              setConfirmDeleteProject(null);
            }
          }}
          loading={deleteMutation.isPending}
        />
      </div>
    </AppShell>
  );
}
