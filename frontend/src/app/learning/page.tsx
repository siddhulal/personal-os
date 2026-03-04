"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import api from "@/lib/api";
import type { LearningRoadmap, Skill, SkillLevel, PageResponse } from "@/types";

const SKILL_LEVEL_CONFIG: Record<
  SkillLevel,
  { label: string; color: string }
> = {
  BEGINNER: { label: "Beginner", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30" },
  ADVANCED: { label: "Advanced", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
  EXPERT: { label: "Expert", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" },
};

export default function LearningPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("roadmaps");

  // Roadmap dialog state
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [roadmapDescription, setRoadmapDescription] = useState("");

  // Skill dialog state
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("BEGINNER");
  const [skillConfidenceScore, setSkillConfidenceScore] = useState<number>(1);
  const [skillNotes, setSkillNotes] = useState("");

  // Delete confirmation state
  const [deleteSkillDialogOpen, setDeleteSkillDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

  // Fetch roadmaps
  const {
    data: roadmapsData,
    isLoading: roadmapsLoading,
    error: roadmapsError,
  } = useQuery<PageResponse<LearningRoadmap>>({
    queryKey: ["roadmaps"],
    queryFn: async () => {
      const response = await api.get("/api/learning/roadmaps");
      return response.data;
    },
  });

  const roadmaps = roadmapsData?.content ?? [];

  // Fetch skills
  const {
    data: skillsData,
    isLoading: skillsLoading,
    error: skillsError,
  } = useQuery<PageResponse<Skill>>({
    queryKey: ["skills"],
    queryFn: async () => {
      const response = await api.get("/api/learning/skills");
      return response.data;
    },
  });

  const skills = skillsData?.content ?? [];

  // Create roadmap mutation
  const createRoadmapMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const response = await api.post("/api/learning/roadmaps", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Roadmap created successfully");
      resetRoadmapDialog();
    },
    onError: () => {
      toast.error("Failed to create roadmap");
    },
  });

  // Create skill mutation
  const createSkillMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      category: string;
      level: SkillLevel;
      confidenceScore: number;
      notes: string | null;
    }) => {
      const response = await api.post("/api/learning/skills", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill added successfully");
      resetSkillDialog();
    },
    onError: () => {
      toast.error("Failed to add skill");
    },
  });

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        category: string;
        level: SkillLevel;
        confidenceScore: number;
        notes: string | null;
      };
    }) => {
      const response = await api.put(`/api/learning/skills/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill updated successfully");
      resetSkillDialog();
    },
    onError: () => {
      toast.error("Failed to update skill");
    },
  });

  // Delete skill mutation
  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/learning/skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill deleted successfully");
      setDeleteSkillDialogOpen(false);
      setSkillToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete skill");
    },
  });

  // Dialog helpers
  function resetRoadmapDialog() {
    setRoadmapDialogOpen(false);
    setRoadmapTitle("");
    setRoadmapDescription("");
  }

  function resetSkillDialog() {
    setSkillDialogOpen(false);
    setEditingSkill(null);
    setSkillName("");
    setSkillCategory("");
    setSkillLevel("BEGINNER");
    setSkillConfidenceScore(1);
    setSkillNotes("");
  }

  function openEditSkillDialog(skill: Skill) {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillCategory(skill.category || "");
    setSkillLevel(skill.level);
    setSkillConfidenceScore(skill.confidenceScore ?? 1);
    setSkillNotes(skill.notes ?? "");
    setSkillDialogOpen(true);
  }

  function handleCreateRoadmap() {
    if (!roadmapTitle.trim()) {
      toast.error("Roadmap title is required");
      return;
    }
    createRoadmapMutation.mutate({
      title: roadmapTitle.trim(),
      description: roadmapDescription.trim(),
    });
  }

  function handleSaveSkill() {
    if (!skillName.trim()) {
      toast.error("Skill name is required");
      return;
    }
    const payload = {
      name: skillName.trim(),
      category: skillCategory.trim(),
      level: skillLevel,
      confidenceScore: skillConfidenceScore,
      notes: skillNotes.trim() || null,
    };
    if (editingSkill) {
      updateSkillMutation.mutate({ id: editingSkill.id, data: payload });
    } else {
      createSkillMutation.mutate(payload);
    }
  }

  function handleConfirmDeleteSkill() {
    if (skillToDelete) {
      deleteSkillMutation.mutate(skillToDelete.id);
    }
  }

  function getRoadmapProgress(roadmap: LearningRoadmap): number {
    if (roadmap.totalTopics === 0) return 0;
    return Math.round((roadmap.completedTopics / roadmap.totalTopics) * 100);
  }

  function getConfidenceDisplay(confidenceScore: number | undefined): number {
    if (!confidenceScore) return 0;
    return Math.min(confidenceScore * 10, 100);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning</h1>
          <p className="text-muted-foreground mt-1">
            Track your learning roadmaps and skills
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="roadmaps">Roadmaps</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          {/* Roadmaps Tab */}
          <TabsContent value="roadmaps" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Roadmaps</h2>
              <Button onClick={() => setRoadmapDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Roadmap
              </Button>
            </div>

            {roadmapsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {roadmapsError && (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-destructive">
                    Failed to load roadmaps. Please try again.
                  </p>
                </CardContent>
              </Card>
            )}

            {!roadmapsLoading && !roadmapsError && roadmaps.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">No roadmaps yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create your first learning roadmap to get started.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setRoadmapDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Roadmap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!roadmapsLoading && !roadmapsError && roadmaps.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roadmaps.map((roadmap) => {
                  const progress = getRoadmapProgress(roadmap);
                  return (
                    <Card
                      key={roadmap.id}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() =>
                        router.push(`/learning/roadmaps/${roadmap.id}`)
                      }
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {roadmap.title}
                        </CardTitle>
                        {roadmap.description && (
                          <CardDescription className="line-clamp-2">
                            {roadmap.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {roadmap.completedTopics}/{roadmap.totalTopics} topics
                          completed
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Badge variant="secondary" className="text-xs">
                          {progress}% complete
                        </Badge>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Skills</h2>
              <Button onClick={() => setSkillDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </div>

            {skillsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {skillsError && (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-destructive">
                    Failed to load skills. Please try again.
                  </p>
                </CardContent>
              </Card>
            )}

            {!skillsLoading && !skillsError && skills.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">No skills tracked yet</p>
                      <p className="text-sm text-muted-foreground">
                        Start tracking your skills and expertise.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSkillDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!skillsLoading && !skillsError && skills.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {skills.map((skill) => {
                  const levelConfig = SKILL_LEVEL_CONFIG[skill.level] || SKILL_LEVEL_CONFIG.BEGINNER;
                  const confidence = getConfidenceDisplay(skill.confidenceScore);
                  return (
                    <Card key={skill.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">
                            {skill.name}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditSkillDialog(skill)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSkillToDelete(skill);
                                setDeleteSkillDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {skill.category && (
                          <CardDescription>{skill.category}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Level:
                          </span>
                          <Badge
                            variant="outline"
                            className={levelConfig.color}
                          >
                            {levelConfig.label}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Confidence
                            </span>
                            <span className="font-medium">{confidence}%</span>
                          </div>
                          <Progress value={confidence} className="h-2" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {formatDate(skill.updatedAt)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Roadmap Dialog */}
        <Dialog open={roadmapDialogOpen} onOpenChange={(open) => {
          if (!open) resetRoadmapDialog();
          else setRoadmapDialogOpen(true);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Roadmap</DialogTitle>
              <DialogDescription>
                Define a learning roadmap to structure your learning journey.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roadmap-title">Title</Label>
                <Input
                  id="roadmap-title"
                  placeholder="e.g., Full-Stack Web Development"
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roadmap-description">Description</Label>
                <Textarea
                  id="roadmap-description"
                  placeholder="Describe what this roadmap covers..."
                  value={roadmapDescription}
                  onChange={(e) => setRoadmapDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetRoadmapDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoadmap}
                disabled={createRoadmapMutation.isPending}
              >
                {createRoadmapMutation.isPending ? "Creating..." : "Create Roadmap"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Skill Dialog */}
        <Dialog open={skillDialogOpen} onOpenChange={(open) => {
          if (!open) resetSkillDialog();
          else setSkillDialogOpen(true);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSkill ? "Edit Skill" : "Add Skill"}
              </DialogTitle>
              <DialogDescription>
                {editingSkill
                  ? "Update the details of your skill."
                  : "Track a new skill you are learning or have mastered."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skill-name">Name</Label>
                <Input
                  id="skill-name"
                  placeholder="e.g., TypeScript"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-category">Category</Label>
                <Input
                  id="skill-category"
                  placeholder="e.g., Programming Languages"
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-level">Level</Label>
                <Select
                  value={skillLevel}
                  onValueChange={(value) => setSkillLevel(value as SkillLevel)}
                >
                  <SelectTrigger id="skill-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-confidence">
                  Confidence Score (1-10)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="skill-confidence"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={skillConfidenceScore}
                    onChange={(e) =>
                      setSkillConfidenceScore(Number(e.target.value))
                    }
                    className="flex-1 h-2 cursor-pointer"
                  />
                  <span className="text-sm font-medium w-8 text-right">
                    {skillConfidenceScore}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-notes">Notes</Label>
                <Textarea
                  id="skill-notes"
                  placeholder="Any notes about this skill..."
                  value={skillNotes}
                  onChange={(e) => setSkillNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetSkillDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSkill}
                disabled={
                  createSkillMutation.isPending || updateSkillMutation.isPending
                }
              >
                {createSkillMutation.isPending || updateSkillMutation.isPending
                  ? "Saving..."
                  : editingSkill
                    ? "Update Skill"
                    : "Add Skill"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Skill Confirmation Dialog */}
        <Dialog
          open={deleteSkillDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteSkillDialogOpen(false);
              setSkillToDelete(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Skill</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{skillToDelete?.name}&quot;? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteSkillDialogOpen(false);
                  setSkillToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteSkill}
                disabled={deleteSkillMutation.isPending}
              >
                {deleteSkillMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
