"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
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
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Video,
  FileText,
  Link2,
  Play,
  SkipForward,
  Target,
  TrendingUp,
  Zap,
  ExternalLink,
  MoreHorizontal,
  GraduationCap,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import api from "@/lib/api";
import { generateExamples, generateDiagram } from "@/lib/api/ai";
import { createPage, getOrCreateDefaultNotebook } from "@/lib/api/notebooks";
import { AiResultDialog } from "@/components/ai/AiResultDialog";
import type { LearningRoadmap, LearningTopic, TopicStatus } from "@/types";

// ==================== Status Configuration ====================

const TOPIC_STATUS_CONFIG: Record<
  TopicStatus,
  { label: string; icon: typeof Circle; color: string; bgColor: string; ringColor: string; next: TopicStatus }
> = {
  NOT_STARTED: {
    label: "Not Started",
    icon: Circle,
    color: "text-gray-400 dark:text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800/50",
    ringColor: "stroke-gray-300 dark:stroke-gray-600",
    next: "IN_PROGRESS",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: Play,
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    ringColor: "stroke-blue-500 dark:stroke-blue-400",
    next: "COMPLETED",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-500 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    ringColor: "stroke-emerald-500 dark:stroke-emerald-400",
    next: "SKIPPED",
  },
  SKIPPED: {
    label: "Skipped",
    icon: SkipForward,
    color: "text-slate-400 dark:text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    ringColor: "stroke-slate-400 dark:stroke-slate-500",
    next: "NOT_STARTED",
  },
};

// ==================== Helpers ====================

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

function getResourceIcon(resource: string) {
  const lower = resource.toLowerCase();
  if (lower.includes("youtube") || lower.includes("video") || lower.includes("vimeo")) return Video;
  if (lower.includes("docs") || lower.includes("documentation") || lower.includes("wiki")) return BookOpen;
  if (lower.includes("article") || lower.includes("blog") || lower.includes("medium") || lower.includes("dev.to")) return FileText;
  if (lower.startsWith("http")) return ExternalLink;
  return Link2;
}

function getResourceLabel(resource: string): string {
  try {
    const url = new URL(resource);
    return url.hostname.replace("www.", "");
  } catch {
    return resource.length > 40 ? resource.slice(0, 37) + "..." : resource;
  }
}

function getSectionProgress(topic: LearningTopic): { completed: number; total: number } {
  if (!topic.subtopics?.length) {
    return {
      completed: topic.status === "COMPLETED" ? 1 : 0,
      total: 1,
    };
  }
  let completed = 0;
  let total = 0;
  for (const sub of topic.subtopics) {
    const subProgress = getSectionProgress(sub);
    completed += subProgress.completed;
    total += subProgress.total;
  }
  return { completed, total };
}

// ==================== Circular Progress Component ====================

function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className = "",
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ==================== Mini Progress Ring for Sections ====================

function MiniProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = 10;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  if (total === 0) return null;

  return (
    <div className="relative inline-flex items-center justify-center" title={`${completed}/${total} completed`}>
      <svg width={28} height={28} className="-rotate-90">
        <circle cx={14} cy={14} r={radius} fill="none" strokeWidth={3} className="stroke-muted/20" />
        <circle
          cx={14} cy={14} r={radius} fill="none" strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className={pct === 100 ? "stroke-emerald-500" : "stroke-blue-500"}
        />
      </svg>
      <span className="absolute text-[8px] font-bold text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ==================== Main Component ====================

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
  const [topicEstimatedHours, setTopicEstimatedHours] = useState<string>("");
  const [topicActualHours, setTopicActualHours] = useState<string>("");
  const [topicResources, setTopicResources] = useState<string[]>([]);
  const [newResource, setNewResource] = useState("");

  // Delete topic confirmation state
  const [deleteTopicDialogOpen, setDeleteTopicDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<LearningTopic | null>(null);

  // Expanded state for subtopics
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

  // Computed stats
  const stats = useMemo(() => {
    if (!roadmap) return null;
    const allTopics = flattenTopics(roadmap.topics ?? []);
    const completed = allTopics.filter((t) => t.status === "COMPLETED").length;
    const inProgress = allTopics.filter((t) => t.status === "IN_PROGRESS").length;
    const notStarted = allTopics.filter((t) => t.status === "NOT_STARTED").length;
    const skipped = allTopics.filter((t) => t.status === "SKIPPED").length;
    const totalEst = allTopics.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
    const totalActual = allTopics.reduce((sum, t) => sum + (t.actualHours ?? 0), 0);
    const total = allTopics.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, inProgress, notStarted, skipped, totalEst, totalActual, total, progress };
  }, [roadmap]);

  // Find "next step" — the first IN_PROGRESS topic, or first NOT_STARTED topic
  const nextStepId = useMemo(() => {
    if (!roadmap) return null;
    const allTopics = flattenTopics(roadmap.topics ?? []);
    const sorted = allTopics.sort((a, b) => a.orderIndex - b.orderIndex);
    const inProgress = sorted.find((t) => t.status === "IN_PROGRESS");
    if (inProgress) return inProgress.id;
    const notStarted = sorted.find((t) => t.status === "NOT_STARTED");
    return notStarted?.id ?? null;
  }, [roadmap]);

  // ==================== Mutations ====================

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

  const createTopicMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string | null;
      orderIndex: number;
      parentTopicId: string | null;
      estimatedHours: number | null;
      actualHours: number | null;
      resources: string | null;
    }) => {
      const response = await api.post(`/api/learning/roadmaps/${roadmapId}/topics`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic added");
      resetTopicDialog();
    },
    onError: () => toast.error("Failed to add topic"),
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ topicId, data }: {
      topicId: string;
      data: { title: string; description: string | null; orderIndex: number; parentTopicId: string | null; estimatedHours?: number | null; actualHours?: number | null; resources?: string | null };
    }) => {
      const response = await api.put(`/api/learning/topics/${topicId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic updated");
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
    onError: () => toast.error("Failed to update status"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      await api.delete(`/api/learning/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", roadmapId] });
      toast.success("Topic deleted");
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
    setTopicEstimatedHours("");
    setTopicActualHours("");
    setTopicResources([]);
    setNewResource("");
  }

  function openEditTopicDialog(topic: LearningTopic) {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description ?? "");
    setTopicOrderIndex(topic.orderIndex);
    setTopicParentId(topic.parentTopicId ?? "");
    setTopicEstimatedHours(topic.estimatedHours != null ? String(topic.estimatedHours) : "");
    setTopicActualHours(topic.actualHours != null ? String(topic.actualHours) : "");
    setTopicResources(topic.resources ?? []);
    setNewResource("");
    setTopicDialogOpen(true);
  }

  function openAddTopicDialog(parentId?: string) {
    resetTopicDialog();
    const allTopics = flattenTopics(roadmap?.topics ?? []);
    const nextIndex = allTopics.length > 0
      ? Math.max(...allTopics.map((t) => t.orderIndex)) + 1
      : 0;
    setTopicOrderIndex(nextIndex);
    if (parentId) setTopicParentId(parentId);
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
      estimatedHours: topicEstimatedHours ? parseFloat(topicEstimatedHours) : null,
      actualHours: topicActualHours ? parseFloat(topicActualHours) : null,
      resources: topicResources.length > 0 ? JSON.stringify(topicResources) : null,
    };
    if (editingTopic) {
      updateTopicMutation.mutate({ topicId: editingTopic.id, data: payload });
    } else {
      createTopicMutation.mutate(payload);
    }
  }

  function handleAddResource() {
    const trimmed = newResource.trim();
    if (trimmed && !topicResources.includes(trimmed)) {
      setTopicResources([...topicResources, trimmed]);
      setNewResource("");
    }
  }

  function handleRemoveResource(index: number) {
    setTopicResources(topicResources.filter((_, i) => i !== index));
  }

  function handleSetStatus(topic: LearningTopic, status: TopicStatus) {
    updateTopicStatusMutation.mutate({ topicId: topic.id, status, title: topic.title });
  }

  function toggleParentCollapse(topicId: string) {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function openEditRoadmapDialog() {
    if (roadmap) {
      setRoadmapTitle(roadmap.title);
      setRoadmapDescription(roadmap.description ?? "");
      setEditRoadmapOpen(true);
    }
  }

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

  // ==================== AI Page Actions ====================

  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const roadmapRef = useRef(roadmap);
  roadmapRef.current = roadmap;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Explain Topic",
        action: "explain_topic",
        icon: GraduationCap,
        onAction: () => {
          const topics = flattenTopics(roadmapRef.current?.topics ?? [])
            .slice(0, 15)
            .map((t) => `- ${t.title} (${t.status})`)
            .join("\n");
          openChat(
            `Here are my learning topics:\n${topics}\n\nPick any topic I'm working on and explain it in depth with examples, key concepts, and common pitfalls.`
          );
        },
      },
      {
        label: "Suggest Next Steps",
        action: "suggest_next",
        icon: TrendingUp,
        onAction: () => {
          const topics = flattenTopics(roadmapRef.current?.topics ?? [])
            .map((t) => `- ${t.title} (${t.status})`)
            .join("\n");
          openChat(
            `Based on my roadmap "${roadmapRef.current?.title}":\n${topics}\n\nWhat should I focus on next? Suggest the optimal learning order and explain why.`
          );
        },
      },
      {
        label: "Add Subtopics",
        action: "add_subtopics",
        icon: Sparkles,
        onAction: () => {
          const topics = flattenTopics(roadmapRef.current?.topics ?? [])
            .slice(0, 10)
            .map((t) => `- ${t.title}`)
            .join("\n");
          openChat(
            `My roadmap "${roadmapRef.current?.title}" has these topics:\n${topics}\n\nSuggest detailed subtopics for each main topic, with estimated hours per subtopic.`
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== Topic Card ====================

  function renderTopicCard(topic: LearningTopic, depth: number = 0) {
    const statusConfig = TOPIC_STATUS_CONFIG[topic.status];
    const StatusIcon = statusConfig.icon;
    const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
    const isCollapsed = collapsedParents.has(topic.id);
    const isNextStep = topic.id === nextStepId;
    const sectionProg = hasSubtopics ? getSectionProgress(topic) : null;

    return (
      <div key={topic.id}>
        <div
          className={`group relative rounded-lg border transition-all duration-200 ${
            isNextStep
              ? "border-primary/50 bg-primary/[0.03] shadow-sm shadow-primary/10 ring-1 ring-primary/20"
              : "border-border/60 hover:border-border bg-card hover:shadow-sm"
          } ${depth > 0 ? "ml-6 border-l-2 border-l-primary/15" : ""}`}
        >
          {/* Next step indicator */}
          {isNextStep && (
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full uppercase tracking-wider">
              Next Step
            </div>
          )}

          <div className={`p-4 ${isNextStep ? "pt-5" : ""}`}>
            <div className="flex items-start gap-3">
              {/* Status icon - clickable to cycle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`mt-0.5 shrink-0 transition-transform hover:scale-110 ${statusConfig.color}`}
                    title={`Status: ${statusConfig.label} (click to change)`}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {(Object.entries(TOPIC_STATUS_CONFIG) as [TopicStatus, typeof statusConfig][]).map(([status, config]) => {
                    const Icon = config.icon;
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleSetStatus(topic, status)}
                        className={topic.status === status ? "bg-accent" : ""}
                      >
                        <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Topic content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {hasSubtopics && (
                        <button
                          onClick={() => toggleParentCollapse(topic.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                      <h3 className={`font-medium leading-snug ${
                        topic.status === "COMPLETED" ? "line-through text-muted-foreground" : ""
                      } ${topic.status === "SKIPPED" ? "text-muted-foreground" : ""}`}>
                        {topic.title}
                      </h3>
                      {sectionProg && <MiniProgressRing completed={sectionProg.completed} total={sectionProg.total} />}
                    </div>
                    {topic.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      onClick={() => handleGenerateExamples(topic)}
                      disabled={aiLoadingTopicId === topic.id}
                      title="AI Examples"
                    >
                      {aiLoadingTopicId === topic.id && aiLoadingType === "examples" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      onClick={() => handleGenerateDiagram(topic)}
                      disabled={aiLoadingTopicId === topic.id}
                      title="AI Diagram"
                    >
                      {aiLoadingTopicId === topic.id && aiLoadingType === "diagram" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditTopicDialog(topic)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddTopicDialog(topic.id)}>
                          <Plus className="h-4 w-4 mr-2" /> Add Subtopic
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setTopicToDelete(topic); setDeleteTopicDialogOpen(true); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Meta row: time + resources */}
                {((topic.estimatedHours !== null && topic.estimatedHours > 0) || (topic.resources && topic.resources.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {topic.estimatedHours !== null && topic.estimatedHours > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                        <Clock className="h-3 w-3" />
                        {topic.estimatedHours}h est.
                        {topic.actualHours !== null && topic.actualHours > 0 && (
                          <span className="text-foreground font-medium">/ {topic.actualHours}h done</span>
                        )}
                      </span>
                    )}
                    {topic.resources && topic.resources.map((resource, idx) => {
                      const Icon = getResourceIcon(resource);
                      return (
                        <a
                          key={idx}
                          href={resource.startsWith("http") ? resource : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${
                            resource.startsWith("http")
                              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {getResourceLabel(resource)}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Notes preview */}
                {topic.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">{topic.notes}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Render subtopics */}
        {hasSubtopics && !isCollapsed && (
          <div className="space-y-2 mt-2">
            {[...topic.subtopics].sort((a, b) => a.orderIndex - b.orderIndex).map((sub) => renderTopicCard(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  // ==================== Render ====================

  return (
    <AppShell>
      <div className="space-y-6 ">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.push("/learning")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Learning
        </Button>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        {!isLoading && !error && roadmap && stats && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h1 className="text-2xl font-bold tracking-tight">{roadmap.title}</h1>
                {roadmap.description && (
                  <p className="text-muted-foreground text-sm">{roadmap.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={openEditRoadmapDialog}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRoadmapOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
              {/* Circular Progress */}
              <div className="flex items-center justify-center md:justify-start">
                <CircularProgress value={stats.progress} size={140} strokeWidth={10}>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.progress}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </CircularProgress>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Completed</span>
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.completed}</div>
                  <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">of {stats.total} topics</div>
                </div>

                <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Play className="h-4 w-4" />
                    <span className="text-xs font-medium">In Progress</span>
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.inProgress}</div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70">active now</div>
                </div>

                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">Remaining</span>
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.notStarted}</div>
                  <div className="text-xs text-amber-600/70 dark:text-amber-400/70">to start</div>
                </div>

                <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 p-3">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Time</span>
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-violet-700 dark:text-violet-300">
                    {stats.totalActual > 0 ? `${stats.totalActual}h` : "0h"}
                  </div>
                  <div className="text-xs text-violet-600/70 dark:text-violet-400/70">
                    {stats.totalEst > 0 ? `of ${stats.totalEst}h est.` : "tracked"}
                  </div>
                </div>
              </div>
            </div>

            {/* Topics section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Topics</h2>
                <Button size="sm" onClick={() => openAddTopicDialog()}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Topic
                </Button>
              </div>

              {roadmap.topics.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-16 text-center border-2 border-dashed border-border/60 rounded-lg">
                  <div className="rounded-full bg-muted p-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">No topics yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add topics to build your learning roadmap.</p>
                  </div>
                  <Button variant="outline" onClick={() => openAddTopicDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Topic
                  </Button>
                </div>
              )}

              {roadmap.topics.length > 0 && (
                <div className="space-y-2">
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
                <Input id="roadmap-title" value={roadmapTitle} onChange={(e) => setRoadmapTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roadmap-description">Description</Label>
                <Textarea id="roadmap-description" value={roadmapDescription} onChange={(e) => setRoadmapDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRoadmapOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateRoadmapMutation.mutate({ title: roadmapTitle.trim(), description: roadmapDescription.trim() || null })}
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
                <Input id="topic-title" placeholder="e.g., React Fundamentals" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-description">Description</Label>
                <Textarea id="topic-description" placeholder="What does this topic cover?" value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic-estimated-hours">Estimated Hours</Label>
                  <Input id="topic-estimated-hours" type="number" min={0} step={0.5} placeholder="e.g., 4" value={topicEstimatedHours} onChange={(e) => setTopicEstimatedHours(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-actual-hours">Actual Hours</Label>
                  <Input id="topic-actual-hours" type="number" min={0} step={0.5} placeholder="e.g., 3" value={topicActualHours} onChange={(e) => setTopicActualHours(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resources</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a URL or resource name"
                    value={newResource}
                    onChange={(e) => setNewResource(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddResource(); } }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddResource} disabled={!newResource.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {topicResources.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {topicResources.map((res, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 text-sm bg-muted rounded px-2 py-1">
                        <span className="truncate">{res}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveResource(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic-parent">Parent Topic</Label>
                  <Select value={topicParentId} onValueChange={setTopicParentId}>
                    <SelectTrigger id="topic-parent">
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {getTopLevelTopics().map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-order">Order</Label>
                  <Input id="topic-order" type="number" min={0} value={topicOrderIndex} onChange={(e) => setTopicOrderIndex(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetTopicDialog}>Cancel</Button>
              <Button onClick={handleSaveTopic} disabled={createTopicMutation.isPending || updateTopicMutation.isPending}>
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
              <Button variant="outline" onClick={() => { setDeleteTopicDialogOpen(false); setTopicToDelete(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={() => topicToDelete && deleteTopicMutation.mutate(topicToDelete.id)} disabled={deleteTopicMutation.isPending}>
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
                    toast.success("Saved to Notes!");
                    setTimeout(() => router.push("/notes"), 500);
                  })
                  .catch(() => toast.error("Failed to save to Notes"));
              },
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
