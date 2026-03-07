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
import { Lightbulb, Sparkles, FolderKanban } from "lucide-react";
import api from "@/lib/api";
import type { Idea, IdeaStatus, IdeaCategory, PageResponse } from "@/types";

interface IdeaFormData {
  title: string;
  description: string;
  status: IdeaStatus;
  category: IdeaCategory;
}

const emptyFormData: IdeaFormData = {
  title: "",
  description: "",
  status: "CAPTURED",
  category: "OTHER",
};

const statusOptions: { value: IdeaStatus; label: string }[] = [
  { value: "CAPTURED", label: "Captured" },
  { value: "EXPLORING", label: "Exploring" },
  { value: "VALIDATED", label: "Validated" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISCARDED", label: "Discarded" },
];

const categoryOptions: { value: IdeaCategory; label: string }[] = [
  { value: "PROJECT", label: "Project" },
  { value: "BUSINESS", label: "Business" },
  { value: "CREATIVE", label: "Creative" },
  { value: "LEARNING", label: "Learning" },
  { value: "PERSONAL", label: "Personal" },
  { value: "OTHER", label: "Other" },
];

function getStatusColor(status: IdeaStatus): string {
  switch (status) {
    case "CAPTURED":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30";
    case "EXPLORING":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30";
    case "VALIDATED":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30";
    case "IN_PROGRESS":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30";
    case "COMPLETED":
      return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30";
    case "DISCARDED":
      return "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30";
    default:
      return "";
  }
}

function getCategoryLabel(category: IdeaCategory): string {
  const option = categoryOptions.find((o) => o.value === category);
  return option ? option.label : category;
}

function getStatusLabel(status: IdeaStatus): string {
  const option = statusOptions.find((o) => o.value === status);
  return option ? option.label : status;
}

export default function IdeasPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [deleteConfirmIdea, setDeleteConfirmIdea] = useState<Idea | null>(null);
  const [formData, setFormData] = useState<IdeaFormData>(emptyFormData);
  const [quickIdeaTitle, setQuickIdeaTitle] = useState("");

  const {
    data: ideasData,
    isLoading,
    isError,
  } = useQuery<PageResponse<Idea>>({
    queryKey: ["ideas"],
    queryFn: async () => {
      const response = await api.get("/api/ideas");
      return response.data;
    },
  });

  const ideas = ideasData?.content ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: IdeaFormData) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        category: data.category,
      };
      const response = await api.post("/api/ideas", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Idea created successfully");
      handleCloseCreate();
      setQuickIdeaTitle("");
    },
    onError: () => {
      toast.error("Failed to create idea");
    },
  });

  const quickCreateMutation = useMutation({
    mutationFn: async (title: string) => {
      const payload = {
        title,
        description: null,
        status: "CAPTURED" as IdeaStatus,
        category: "OTHER" as IdeaCategory,
      };
      const response = await api.post("/api/ideas", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Idea captured!");
      setQuickIdeaTitle("");
    },
    onError: () => {
      toast.error("Failed to capture idea");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IdeaFormData }) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        category: data.category,
      };
      const response = await api.put(`/api/ideas/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Idea updated successfully");
      handleCloseEdit();
    },
    onError: () => {
      toast.error("Failed to update idea");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/ideas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Idea deleted successfully");
      setDeleteConfirmIdea(null);
    },
    onError: () => {
      toast.error("Failed to delete idea");
    },
  });

  function handleOpenCreate() {
    setFormData(emptyFormData);
    setIsCreateOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateOpen(false);
    setFormData(emptyFormData);
  }

  function handleOpenEdit(idea: Idea) {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || "",
      status: idea.status,
      category: idea.category,
    });
  }

  function handleCloseEdit() {
    setEditingIdea(null);
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
    if (!editingIdea) return;
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    updateMutation.mutate({ id: editingIdea.id, data: formData });
  }

  function handleDeleteConfirm() {
    if (!deleteConfirmIdea) return;
    deleteMutation.mutate(deleteConfirmIdea.id);
  }

  function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickIdeaTitle.trim()) return;
    quickCreateMutation.mutate(quickIdeaTitle.trim());
  }

  function truncateDescription(
    description: string | null,
    maxLength: number = 120
  ): string {
    if (!description) return "";
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const ideasRef = useRef(ideas);
  ideasRef.current = ideas;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Expand Idea",
        action: "expand_idea",
        icon: Sparkles,
        onAction: () => {
          const first = ideasRef.current[0];
          const context = first
            ? `Expand on this idea and suggest next steps:\n\nIdea: ${first.title}\nDescription: ${first.description || "N/A"}\nCategory: ${first.category}\n\nPlease elaborate on this idea, identify potential challenges, and suggest 3-5 concrete next steps to make it happen.`
            : "I have an idea I want to develop further. Describe your idea and I will help expand it with details, challenges, and next steps.";
          openChat(context);
        },
      },
      {
        label: "Brainstorm Ideas",
        action: "brainstorm",
        icon: Lightbulb,
        onAction: () => {
          const existing = ideasRef.current.slice(0, 10)
            .map((i) => `- ${i.title} (${i.category})`).join("\n");
          openChat(
            `Help me brainstorm new ideas. Here are my existing ideas:\n\n${existing || "None yet."}\n\nSuggest 5 creative new ideas that complement or build upon my existing ones. For each, give a title, brief description, and category.`
          );
        },
      },
      {
        label: "Turn Idea into Project",
        action: "idea_to_project",
        icon: FolderKanban,
        onAction: () => {
          const first = ideasRef.current[0];
          const context = first
            ? `Turn this idea into a structured project plan:\n\nIdea: ${first.title}\nDescription: ${first.description || "N/A"}\n\nCreate a project plan with phases, milestones, required resources, and a timeline. Format it so I can save it as a project.`
            : "I want to turn an idea into a project. Describe your idea and I will create a structured project plan from it.";
          openChat(context);
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ideas</h1>
            <p className="text-muted-foreground mt-1">
              Capture and explore your ideas
            </p>
          </div>
          <Button onClick={handleOpenCreate}>New Idea</Button>
        </div>

        <form onSubmit={handleQuickCreate} className="flex gap-3">
          <Input
            placeholder="Capture an idea..."
            value={quickIdeaTitle}
            onChange={(e) => setQuickIdeaTitle(e.target.value)}
            className="flex-1 h-12 text-base"
          />
          <Button
            type="submit"
            size="lg"
            disabled={
              !quickIdeaTitle.trim() || quickCreateMutation.isPending
            }
          >
            {quickCreateMutation.isPending ? "Saving..." : "Capture"}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded-full w-20" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
                <CardFooter>
                  <div className="h-4 bg-muted rounded w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Failed to load ideas.</p>
            <p className="text-muted-foreground mt-1">
              Please try refreshing the page.
            </p>
          </div>
        )}

        {!isLoading && !isError && ideas.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">No ideas yet</h3>
            <p className="text-muted-foreground mt-1">
              Use the quick capture above or create a detailed idea.
            </p>
            <Button onClick={handleOpenCreate} className="mt-4">
              New Idea
            </Button>
          </div>
        )}

        {!isLoading && !isError && ideas.length > 0 && (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <Card
                key={idea.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenEdit(idea)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-1">
                      {idea.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {idea.status && (
                        <Badge
                          variant="outline"
                          className={getStatusColor(idea.status)}
                        >
                          {getStatusLabel(idea.status)}
                        </Badge>
                      )}
                      {idea.category && (
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(idea.category)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {(idea.description || (idea.tags && idea.tags.length > 0)) && (
                  <CardContent className="pb-2">
                    {idea.description && (
                      <p className="text-sm text-muted-foreground">
                        {truncateDescription(idea.description)}
                      </p>
                    )}
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {idea.tags.map((tag) => (
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
                  </CardContent>
                )}
                <CardFooter className="pt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(idea.createdAt)}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>New Idea</DialogTitle>
                <DialogDescription>
                  Capture a new idea with details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-idea-title">Title</Label>
                  <Input
                    id="create-idea-title"
                    placeholder="Idea title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-idea-description">Description</Label>
                  <Textarea
                    id="create-idea-description"
                    placeholder="Describe your idea..."
                    className="min-h-[120px]"
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
                      onValueChange={(value: IdeaStatus) =>
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
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: IdeaCategory) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  {createMutation.isPending ? "Creating..." : "Create Idea"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editingIdea !== null}
          onOpenChange={(open) => {
            if (!open) handleCloseEdit();
          }}
        >
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Idea</DialogTitle>
                <DialogDescription>
                  Update your idea details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-idea-title">Title</Label>
                  <Input
                    id="edit-idea-title"
                    placeholder="Idea title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-idea-description">Description</Label>
                  <Textarea
                    id="edit-idea-description"
                    placeholder="Describe your idea..."
                    className="min-h-[120px]"
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
                      onValueChange={(value: IdeaStatus) =>
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
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: IdeaCategory) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    if (editingIdea) {
                      setDeleteConfirmIdea(editingIdea);
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
          open={deleteConfirmIdea !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmIdea(null);
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Idea</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmIdea?.title}
                &quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmIdea(null)}
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
