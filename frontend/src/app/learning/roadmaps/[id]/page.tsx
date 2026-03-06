"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GitBranch,
  Loader2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import api from "@/lib/api";
import { generateExamples, generateDiagram } from "@/lib/api/ai";
import { createPage, getOrCreateDefaultNotebook } from "@/lib/api/notebooks";
import { AiResultDialog } from "@/components/ai/AiResultDialog";
import type { LearningRoadmap, LearningTopic, TopicStatus } from "@/types";

const TOPIC_STATUS_CONFIG: Record<
  TopicStatus,
  { label: string; color: string; next: TopicStatus }
> = {
  NOT_STARTED: {
    label: "Not Started",
    color: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-500/30",
    next: "IN_PROGRESS",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30",
    next: "COMPLETED",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    next: "SKIPPED",
  },
  SKIPPED: {
    label: "Skipped",
    color: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30",
    next: "NOT_STARTED",
  },
};

export default function RoadmapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const roadmapId = params.id as string;

  // Roadmap edit/delete state
  const [editRoadmapOpen, setEditRoadmapOpen] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [roadmapDescription, setRoadmapDescription] = useState("");
  const [deleteRoadmapOpen, setDeleteRoadmapOpen] = useState(false);

  // Topic dialog state
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<LearningTopic | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicOrderIndex, setTopicOrderIndex] = useState<number>(0);
  const [topicParentId, setTopicParentId] = useState<string>("");

  // Delete topic confirmation state
  const [deleteTopicDialogOpen, setDeleteTopicDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<LearningTopic | null>(null);

  // Expanded state for notes and subtopics
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  // AI state
  const [aiResultOpen, setAiResultOpen] = useState(false);
  const [aiResultTitle, setAiResultTitle] = useState("");
  const [aiResultContent, setAiResultContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingTopicId, setAiLoadingTopicId] = useState<string | null>(null);
  const [aiLoadingType, setAiLoadingType] = useState<string | null>(null);

  // Fetch roadmap
  const {
    data: roadmap,
    isLoading,
    error,
  } = useQuery<LearningRoadmap>({
    queryKey: ["roadmap", roadmapId],
    queryFn: async () => {
      const response = await api.get(`/api/learning/roadmaps/${roadmapId}`);
      return response.data;
    },
  });

  // ==================== Roadmap mutations ====================

  const updateRoadmapMutation = useMutation({
    mutationFn: async (data: { title: string; description: string | null }) => {
      const response = await api.put(`/api/learning/roadmaps/${roadmapId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Roadmap updated");
      setEditRoadmapOpen(false);
    },
    onError: () => toast.error("Failed to update roadmap"),
  });

  const deleteRoadmapMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/learning/roadmaps/${roadmapId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Roadmap deleted");
      router.push("/learning");
    },
    onError: () => toast.error("Failed to delete roadmap"),
  });

  // ==================== Topic mutations ====================

  const createTopicMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string | null;
      orderIndex: number;
      parentTopicId: string | null;
    }) => {
      const response = await api.post(`/api/learning/roadmaps/${roadmapId}/topics`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic added successfully");
      resetTopicDialog();
    },
    onError: () => toast.error("Failed to add topic"),
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ topicId, data }: {
      topicId: string;
      data: { title: string; description: string | null; orderIndex: number; parentTopicId: string | null };
    }) => {
      const response = await api.put(`/api/learning/topics/${topicId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic updated successfully");
      resetTopicDialog();
    },
    onError: () => toast.error("Failed to update topic"),
  });

  const updateTopicStatusMutation = useMutation({
    mutationFn: async ({ topicId, status, title }: { topicId: string; status: TopicStatus; title: string }) => {
      const response = await api.put(`/api/learning/topics/${topicId}`, { title, status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
    },
    onError: () => toast.error("Failed to update topic status"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      await api.delete(`/api/learning/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic deleted successfully");
      setDeleteTopicDialogOpen(false);
      setTopicToDelete(null);
    },
    onError: () => toast.error("Failed to delete topic"),
  });

  // ==================== Dialog helpers ====================

  function resetTopicDialog() {
    setTopicDialogOpen(false);
    setEditingTopic(null);
    setTopicTitle("");
    setTopicDescription("");
    setTopicOrderIndex(0);
    setTopicParentId("");
  }

  function openEditTopicDialog(topic: LearningTopic) {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description ?? "");
    setTopicOrderIndex(topic.orderIndex);
    setTopicParentId(topic.parentTopicId ?? "");
    setTopicDialogOpen(true);
  }

  function openAddTopicDialog() {
    resetTopicDialog();
    const allTopics = flattenTopics(roadmap?.topics ?? []);
    const nextIndex = allTopics.length > 0
      ? Math.max(...allTopics.map((t) => t.orderIndex)) + 1
      : 0;
    setTopicOrderIndex(nextIndex);
    setTopicDialogOpen(true);
  }

  function handleSaveTopic() {
    if (!topicTitle.trim()) {
      toast.error("Topic title is required");
      return;
    }
    const payload = {
      title: topicTitle.trim(),
      description: topicDescription.trim() || null,
      orderIndex: topicOrderIndex,
      parentTopicId: topicParentId && topicParentId !== "none" ? topicParentId : null,
    };
    if (editingTopic) {
      updateTopicMutation.mutate({ topicId: editingTopic.id, data: payload });
    } else {
      createTopicMutation.mutate(payload);
    }
  }

  function handleCycleStatus(topic: LearningTopic) {
    const nextStatus = TOPIC_STATUS_CONFIG[topic.status].next;
    updateTopicStatusMutation.mutate({ topicId: topic.id, status: nextStatus, title: topic.title });
  }

  function handleConfirmDeleteTopic() {
    if (topicToDelete) {
      deleteTopicMutation.mutate(topicToDelete.id);
    }
  }

  function toggleNotes(topicId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function toggleParentCollapse(topicId: string) {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function getOverallProgress(): number {
    if (!roadmap || roadmap.totalTopics === 0) return 0;
    return Math.round((roadmap.completedTopics / roadmap.totalTopics) * 100);
  }

  function openEditRoadmapDialog() {
    if (roadmap) {
      setRoadmapTitle(roadmap.title);
      setRoadmapDescription(roadmap.description ?? "");
      setEditRoadmapOpen(true);
    }
  }

  // Flatten topics tree for getting all topics
  function flattenTopics(topics: LearningTopic[]): LearningTopic[] {
    const result: LearningTopic[] = [];
    for (const topic of topics) {
      result.push(topic);
      if (topic.subtopics?.length) {
        result.push(...flattenTopics(topic.subtopics));
      }
    }
    return result;
  }

  // Get top-level topics for parent selection
  function getTopLevelTopics(): LearningTopic[] {
    if (!roadmap) return [];
    return roadmap.topics.filter((t) => !editingTopic || t.id !== editingTopic.id);
  }

  // ==================== AI handlers ====================

  async function handleGenerateExamples(topic: LearningTopic) {
    setAiLoading(true);
    setAiLoadingTopicId(topic.id);
    setAiLoadingType("examples");
    setAiResultTitle(`Code Examples: ${topic.title}`);
    setAiResultContent("");
    setAiResultOpen(true);
    try {
      const result = await generateExamples(topic.id);
      setAiResultContent(result.content || "No content generated.");
    } catch {
      setAiResultContent("Failed to generate examples. Please check your AI settings and try again.");
    } finally {
      setAiLoading(false);
      setAiLoadingTopicId(null);
      setAiLoadingType(null);
    }
  }

  async function handleGenerateDiagram(topic: LearningTopic) {
    setAiLoading(true);
    setAiLoadingTopicId(topic.id);
    setAiLoadingType("diagram");
    setAiResultTitle(`Diagram: ${topic.title}`);
    setAiResultContent("");
    setAiResultOpen(true);
    try {
      const result = await generateDiagram(topic.id, "flowchart");
      setAiResultContent(result.content || "No content generated.");
    } catch {
      setAiResultContent("Failed to generate diagram. Please check your AI settings and try again.");
    } finally {
      setAiLoading(false);
      setAiLoadingTopicId(null);
      setAiLoadingType(null);
    }
  }

  // ==================== Topic Rendering ====================

  function renderTopicCard(topic: LearningTopic, depth: number = 0) {
    const statusConfig = TOPIC_STATUS_CONFIG[topic.status];
    const isNotesExpanded = expandedNotes.has(topic.id);
    const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
    const isCollapsed = collapsedParents.has(topic.id);

    return (
      <div key={topic.id} style={{ marginLeft: depth > 0 ? `${depth * 1.5}rem` : undefined }}>
        <Card className={depth > 0 ? "border-l-2 border-l-primary/20" : ""}>
          <CardContent className="py-4">
            <div className="space-y-3">
              {/* Topic header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Collapse toggle for parents */}
                  {hasSubtopics ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 mt-0.5"
                      onClick={() => toggleParentCollapse(topic.id)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <div className="w-6 shrink-0" />
                  )}
                  <Badge
                    variant="outline"
                    className={`cursor-pointer shrink-0 mt-0.5 ${statusConfig.color}`}
                    onClick={() => handleCycleStatus(topic)}
                    title={`Click to change status to ${TOPIC_STATUS_CONFIG[statusConfig.next].label}`}
                  >
                    {statusConfig.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium leading-tight">{topic.title}</h3>
                    {topic.description && (
                      <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-purple-600 hover:text-purple-700"
                    onClick={() => handleGenerateExamples(topic)}
                    disabled={aiLoadingTopicId === topic.id}
                    title="Generate code examples with AI"
                  >
                    {aiLoadingTopicId === topic.id && aiLoadingType === "examples" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700"
                    onClick={() => handleGenerateDiagram(topic)}
                    disabled={aiLoadingTopicId === topic.id}
                    title="Generate diagram with AI"
                  >
                    {aiLoadingTopicId === topic.id && aiLoadingType === "diagram" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                  </Button>
                  {topic.notes && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleNotes(topic.id)}
                      title={isNotesExpanded ? "Collapse notes" : "Expand notes"}
                    >
                      {isNotesExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTopicDialog(topic)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setTopicToDelete(topic);
                      setDeleteTopicDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expandable notes */}
              {topic.notes && isNotesExpanded && (
                <div className="ml-0 sm:ml-12 rounded-md bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{topic.notes}</p>
                </div>
              )}

              {/* Resources */}
              {topic.resources && topic.resources.length > 0 && (
                <div className="ml-0 sm:ml-12">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Resources:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {topic.resources.map((resource, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        {resource.startsWith("http") ? (
                          <a href={resource} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {resource}
                          </a>
                        ) : (
                          resource
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Time tracking */}
              {(topic.estimatedHours !== null || topic.actualHours !== null) && (
                <div className="ml-0 sm:ml-12 flex gap-4 text-xs text-muted-foreground">
                  {topic.estimatedHours !== null && <span>Estimated: {topic.estimatedHours}h</span>}
                  {topic.actualHours !== null && <span>Actual: {topic.actualHours}h</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render subtopics */}
        {hasSubtopics && !isCollapsed && (
          <div className="space-y-2 mt-2">
            {[...topic.subtopics].sort((a, b) => a.orderIndex - b.orderIndex).map((sub) => renderTopicCard(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => router.push("/learning")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Learning
        </Button>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-destructive">Failed to load roadmap. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Roadmap content */}
        {!isLoading && !error && roadmap && (
          <>
            {/* Header with edit/delete */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h1 className="text-3xl font-bold tracking-tight">{roadmap.title}</h1>
                {roadmap.description && (
                  <p className="text-muted-foreground">{roadmap.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={openEditRoadmapDialog}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRoadmapOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Overall progress */}
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall Progress</span>
                    <span className="text-muted-foreground">
                      {roadmap.completedTopics}/{roadmap.totalTopics} topics completed ({getOverallProgress()}%)
                    </span>
                  </div>
                  <Progress value={getOverallProgress()} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Topics section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Topics</h2>
                <Button onClick={openAddTopicDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </div>

              {roadmap.topics.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="font-medium">No topics yet</p>
                      <p className="text-sm text-muted-foreground">Add topics to build your learning roadmap.</p>
                      <Button variant="outline" onClick={openAddTopicDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Topic
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {roadmap.topics.length > 0 && (
                <div className="space-y-3">
                  {[...roadmap.topics].sort((a, b) => a.orderIndex - b.orderIndex).map((topic) => renderTopicCard(topic, 0))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Roadmap Dialog */}
        <Dialog open={editRoadmapOpen} onOpenChange={setEditRoadmapOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Roadmap</DialogTitle>
              <DialogDescription>Update your roadmap title and description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roadmap-title">Title</Label>
                <Input
                  id="roadmap-title"
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roadmap-description">Description</Label>
                <Textarea
                  id="roadmap-description"
                  value={roadmapDescription}
                  onChange={(e) => setRoadmapDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRoadmapOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateRoadmapMutation.mutate({
                  title: roadmapTitle.trim(),
                  description: roadmapDescription.trim() || null,
                })}
                disabled={!roadmapTitle.trim() || updateRoadmapMutation.isPending}
              >
                {updateRoadmapMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Roadmap Confirmation */}
        <ConfirmDialog
          open={deleteRoadmapOpen}
          onOpenChange={setDeleteRoadmapOpen}
          title="Delete Roadmap"
          description={`Are you sure you want to delete "${roadmap?.title}"? All topics will also be deleted. This action cannot be undone.`}
          onConfirm={() => deleteRoadmapMutation.mutate()}
          loading={deleteRoadmapMutation.isPending}
        />

        {/* Add/Edit Topic Dialog */}
        <Dialog
          open={topicDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetTopicDialog();
            else setTopicDialogOpen(true);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTopic ? "Edit Topic" : "Add Topic"}</DialogTitle>
              <DialogDescription>
                {editingTopic ? "Update the details of this topic." : "Add a new topic to your roadmap."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-title">Title</Label>
                <Input
                  id="topic-title"
                  placeholder="e.g., React Fundamentals"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-description">Description</Label>
                <Textarea
                  id="topic-description"
                  placeholder="What does this topic cover?"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-order">Order Index</Label>
                <Input
                  id="topic-order"
                  type="number"
                  min={0}
                  value={topicOrderIndex}
                  onChange={(e) => setTopicOrderIndex(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-parent">Parent Topic (optional, for subtopics)</Label>
                <Select value={topicParentId} onValueChange={setTopicParentId}>
                  <SelectTrigger id="topic-parent">
                    <SelectValue placeholder="None (top-level topic)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level topic)</SelectItem>
                    {getTopLevelTopics().map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetTopicDialog}>Cancel</Button>
              <Button
                onClick={handleSaveTopic}
                disabled={createTopicMutation.isPending || updateTopicMutation.isPending}
              >
                {createTopicMutation.isPending || updateTopicMutation.isPending
                  ? "Saving..."
                  : editingTopic ? "Update Topic" : "Add Topic"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Topic Confirmation Dialog */}
        <Dialog
          open={deleteTopicDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTopicDialogOpen(false);
              setTopicToDelete(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Topic</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{topicToDelete?.title}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeleteTopicDialogOpen(false); setTopicToDelete(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteTopic} disabled={deleteTopicMutation.isPending}>
                {deleteTopicMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Result Dialog */}
        <AiResultDialog
          open={aiResultOpen}
          onOpenChange={setAiResultOpen}
          title={aiResultTitle}
          content={aiResultContent}
          isLoading={aiLoading}
          actions={[
            {
              label: "Save to Notes",
              onClick: () => {
                getOrCreateDefaultNotebook("Learning Notes")
                  .then((notebook) => {
                    const sectionId = notebook.sections?.[0]?.id;
                    return createPage({
                      title: aiResultTitle,
                      content: aiResultContent,
                      notebookId: notebook.id,
                      sectionId: sectionId,
                    });
                  })
                  .then(() => {
                    setAiResultOpen(false);
                    toast.success("Saved to Notes! Opening notes...");
                    setTimeout(() => router.push("/notes"), 500);
                  })
                  .catch(() => {
                    toast.error("Failed to save to Notes");
                  });
              },
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
