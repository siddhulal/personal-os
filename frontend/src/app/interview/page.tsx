"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  MessageSquare,
  Timer,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Play,
  Square,
  SkipForward,
  Trophy,
  Target,
  Brain,
  CheckCircle2,
} from "lucide-react";
import type {
  InterviewQuestion,
  InterviewAnswer,
  InterviewProgress,
  QuestionDifficulty,
  QuestionCategory,
  PageResponse,
} from "@/types";

const CATEGORIES: QuestionCategory[] = [
  "BEHAVIORAL",
  "TECHNICAL",
  "SYSTEM_DESIGN",
  "CODING",
  "SITUATIONAL",
  "OTHER",
];

const DIFFICULTIES: QuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];

function getDifficultyColor(difficulty: QuestionDifficulty): string {
  switch (difficulty) {
    case "EASY":
      return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30";
    case "MEDIUM":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30";
    case "HARD":
      return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30";
    default:
      return "";
  }
}

function getCategoryLabel(category: QuestionCategory): string {
  return category.replace(/_/g, " ");
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function InterviewPage() {
  const queryClient = useQueryClient();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Prep</h1>
          <p className="text-muted-foreground mt-1">
            Practice questions, run mock interviews, and track your progress
          </p>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="questions">
              <MessageSquare className="h-4 w-4 mr-2" />
              Question Bank
            </TabsTrigger>
            <TabsTrigger value="mock">
              <Timer className="h-4 w-4 mr-2" />
              Mock Interview
            </TabsTrigger>
            <TabsTrigger value="progress">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions">
            <QuestionBankTab queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="mock">
            <MockInterviewTab queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ================================================================
   TAB 1: QUESTION BANK
   ================================================================ */

function QuestionBankTab({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [practiceQuestionId, setPracticeQuestionId] = useState<string | null>(null);
  const [answerFormOpenFor, setAnswerFormOpenFor] = useState<string | null>(null);

  // Add question form state
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState<QuestionCategory>("BEHAVIORAL");
  const [newDifficulty, setNewDifficulty] = useState<QuestionDifficulty>("MEDIUM");

  // Practice form state
  const [practiceConfidence, setPracticeConfidence] = useState(5);
  const [practiceSelfRating, setPracticeSelfRating] = useState(3);
  const [practiceTimeTaken, setPracticeTimeTaken] = useState("");
  const [practiceNotes, setPracticeNotes] = useState("");

  // Answer form state
  const [newAnswerContent, setNewAnswerContent] = useState("");

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (categoryFilter !== "ALL") params.category = categoryFilter;
    if (difficultyFilter !== "ALL") params.difficulty = difficultyFilter;
    return params;
  }, [categoryFilter, difficultyFilter]);

  const {
    data: questionsData,
    isLoading,
    isError,
  } = useQuery<PageResponse<InterviewQuestion>>({
    queryKey: ["interview-questions", categoryFilter, difficultyFilter],
    queryFn: async () => {
      const res = await api.get("/api/interview/questions", {
        params: buildQueryParams(),
      });
      return res.data;
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: {
      question: string;
      category: QuestionCategory;
      difficulty: QuestionDifficulty;
    }) => {
      const res = await api.post("/api/interview/questions", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-questions"] });
      toast.success("Question added successfully");
      setAddDialogOpen(false);
      setNewQuestion("");
      setNewCategory("BEHAVIORAL");
      setNewDifficulty("MEDIUM");
    },
    onError: () => {
      toast.error("Failed to add question");
    },
  });

  const addAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; content: string }) => {
      const res = await api.post(
        `/api/interview/questions/${data.questionId}/answers`,
        { content: data.content }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-questions"] });
      toast.success("Answer added successfully");
      setNewAnswerContent("");
      setAnswerFormOpenFor(null);
    },
    onError: () => {
      toast.error("Failed to add answer");
    },
  });

  const practiceMutation = useMutation({
    mutationFn: async (data: {
      questionId: string;
      confidenceRating: number;
      selfRating: number;
      durationSeconds: number | null;
      notes: string | null;
    }) => {
      const res = await api.post(
        `/api/interview/questions/${data.questionId}/practice`,
        {
          confidenceRating: data.confidenceRating,
          selfRating: data.selfRating,
          durationSeconds: data.durationSeconds,
          notes: data.notes,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview-progress"] });
      toast.success("Practice session recorded");
      setPracticeDialogOpen(false);
      resetPracticeForm();
    },
    onError: () => {
      toast.error("Failed to record practice session");
    },
  });

  function resetPracticeForm() {
    setPracticeConfidence(5);
    setPracticeSelfRating(3);
    setPracticeTimeTaken("");
    setPracticeNotes("");
    setPracticeQuestionId(null);
  }

  function handleAddQuestion() {
    if (!newQuestion.trim()) {
      toast.error("Question text is required");
      return;
    }
    addQuestionMutation.mutate({
      question: newQuestion.trim(),
      category: newCategory,
      difficulty: newDifficulty,
    });
  }

  function handleAddAnswer(questionId: string) {
    if (!newAnswerContent.trim()) {
      toast.error("Answer content is required");
      return;
    }
    addAnswerMutation.mutate({
      questionId,
      content: newAnswerContent.trim(),
    });
  }

  function handlePractice() {
    if (!practiceQuestionId) return;
    const durationSeconds = practiceTimeTaken
      ? parseInt(practiceTimeTaken, 10)
      : null;
    practiceMutation.mutate({
      questionId: practiceQuestionId,
      confidenceRating: practiceConfidence,
      selfRating: practiceSelfRating,
      durationSeconds,
      notes: practiceNotes.trim() || null,
    });
  }

  function openPracticeDialog(questionId: string) {
    setPracticeQuestionId(questionId);
    setPracticeDialogOpen(true);
  }

  const questions = questionsData?.content ?? [];

  return (
    <div className="space-y-6">
      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Difficulties</SelectItem>
              {DIFFICULTIES.map((diff) => (
                <SelectItem key={diff} value={diff}>
                  {diff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Question List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Failed to load questions. Please try again.</p>
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No questions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start building your question bank by adding your first interview question.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => {
            const isExpanded = expandedId === question.id;
            return (
              <Card key={question.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : question.id)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <CardTitle className="text-base font-medium leading-snug">
                        {question.question}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {getCategoryLabel(question.category)}
                        </Badge>
                        <Badge
                          className={getDifficultyColor(question.difficulty)}
                        >
                          {question.difficulty}
                        </Badge>
                        {question.practiceCount > 0 ? (
                          <Badge variant="secondary">
                            Practiced {question.practiceCount}x
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="opacity-60">
                            Not practiced
                          </Badge>
                        )}
                        {question.lastPracticedAt && (
                          <span className="text-xs text-muted-foreground">
                            Last:{" "}
                            {new Date(
                              question.lastPracticedAt
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPracticeDialog(question.id);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Practice
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    <Separator />

                    {/* Answers Section */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">
                        Answers ({question.answers?.length ?? 0})
                      </h4>
                      {question.answers && question.answers.length > 0 ? (
                        <div className="space-y-3">
                          {question.answers.map(
                            (answer: InterviewAnswer, index: number) => (
                              <div
                                key={answer.id}
                                className="rounded-md border p-4 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    Answer {index + 1}
                                  </span>
                                  {answer.isFavorite && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Favorite
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">
                                  {answer.content}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Added{" "}
                                  {new Date(
                                    answer.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No answers yet. Add one below.
                        </p>
                      )}
                    </div>

                    {/* Add Answer Form */}
                    {answerFormOpenFor === question.id ? (
                      <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                        <Label htmlFor={`answer-${question.id}`}>
                          New Answer
                        </Label>
                        <Textarea
                          id={`answer-${question.id}`}
                          placeholder="Write your answer here... Include key points, example scenarios, and things to avoid."
                          value={newAnswerContent}
                          onChange={(e) => setNewAnswerContent(e.target.value)}
                          rows={5}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddAnswer(question.id)}
                            disabled={addAnswerMutation.isPending}
                          >
                            {addAnswerMutation.isPending
                              ? "Saving..."
                              : "Save Answer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAnswerFormOpenFor(null);
                              setNewAnswerContent("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAnswerFormOpenFor(question.id);
                          setNewAnswerContent("");
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Answer
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Question Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Interview Question</DialogTitle>
            <DialogDescription>
              Add a new question to your interview preparation bank.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="question-text">Question</Label>
              <Textarea
                id="question-text"
                placeholder="e.g., Tell me about a time you dealt with a difficult team member..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newCategory}
                  onValueChange={(val) =>
                    setNewCategory(val as QuestionCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={newDifficulty}
                  onValueChange={(val) =>
                    setNewDifficulty(val as QuestionDifficulty)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {diff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddQuestion}
              disabled={addQuestionMutation.isPending}
            >
              {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Practice Dialog */}
      <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Practice Session</DialogTitle>
            <DialogDescription>
              Rate your performance for this practice attempt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Confidence Score (1-10): {practiceConfidence}</Label>
              <Input
                type="range"
                min={1}
                max={10}
                value={practiceConfidence}
                onChange={(e) =>
                  setPracticeConfidence(parseInt(e.target.value, 10))
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Not confident</span>
                <span>10 - Very confident</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Self Rating (1-5): {practiceSelfRating}</Label>
              <Input
                type="range"
                min={1}
                max={5}
                value={practiceSelfRating}
                onChange={(e) =>
                  setPracticeSelfRating(parseInt(e.target.value, 10))
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Poor</span>
                <span>5 - Excellent</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="practice-time">Time Taken (seconds)</Label>
              <Input
                id="practice-time"
                type="number"
                placeholder="e.g., 120"
                value={practiceTimeTaken}
                onChange={(e) => setPracticeTimeTaken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="practice-notes">Notes (optional)</Label>
              <Textarea
                id="practice-notes"
                placeholder="Any reflections on this practice session..."
                value={practiceNotes}
                onChange={(e) => setPracticeNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPracticeDialogOpen(false);
                resetPracticeForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePractice}
              disabled={practiceMutation.isPending}
            >
              {practiceMutation.isPending ? "Recording..." : "Record Practice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================
   TAB 2: MOCK INTERVIEW
   ================================================================ */

function MockInterviewTab({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rating form state
  const [mockConfidence, setMockConfidence] = useState(5);
  const [mockSelfRating, setMockSelfRating] = useState(3);

  const practiceMutation = useMutation({
    mutationFn: async (data: {
      questionId: string;
      confidenceRating: number;
      selfRating: number;
      durationSeconds: number;
      notes: string | null;
    }) => {
      const res = await api.post(
        `/api/interview/questions/${data.questionId}/practice`,
        {
          confidenceRating: data.confidenceRating,
          selfRating: data.selfRating,
          durationSeconds: data.durationSeconds,
          notes: data.notes,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-questions"] });
      queryClient.invalidateQueries({ queryKey: ["interview-progress"] });
      toast.success("Practice recorded");
    },
    onError: () => {
      toast.error("Failed to record practice");
    },
  });

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  async function fetchRandomQuestion() {
    setIsFetchingQuestion(true);
    try {
      const res = await api.get("/api/interview/questions/random");
      setCurrentQuestion(res.data);
      setUserAnswer("");
      setElapsedSeconds(0);
      setHasSubmitted(false);
      setIsTimerRunning(true);
    } catch {
      toast.error(
        "Failed to fetch a question. Make sure you have questions in your bank."
      );
      setIsSessionActive(false);
      setIsTimerRunning(false);
    } finally {
      setIsFetchingQuestion(false);
    }
  }

  function handleStartSession() {
    setIsSessionActive(true);
    fetchRandomQuestion();
  }

  function handleSubmitAndRate() {
    setIsTimerRunning(false);
    setShowRatingDialog(true);
  }

  function handleRatingSubmit() {
    if (!currentQuestion) return;
    practiceMutation.mutate({
      questionId: currentQuestion.id,
      confidenceRating: mockConfidence,
      selfRating: mockSelfRating,
      durationSeconds: elapsedSeconds,
      notes: userAnswer.trim() || null,
    });
    setShowRatingDialog(false);
    setHasSubmitted(true);
    setMockConfidence(5);
    setMockSelfRating(3);
  }

  function handleNextQuestion() {
    fetchRandomQuestion();
  }

  function handleEndSession() {
    setIsSessionActive(false);
    setCurrentQuestion(null);
    setUserAnswer("");
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setHasSubmitted(false);
  }

  if (!isSessionActive) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-2xl font-semibold mb-2">Mock Interview</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start a mock interview session. Random questions will be presented
              one at a time. A timer will track how long you spend on each
              question. Rate yourself after answering.
            </p>
            <Button size="lg" onClick={handleStartSession}>
              <Play className="h-5 w-5 mr-2" />
              Start Mock Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFetchingQuestion) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Fetching a question...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground mb-4">
            No question available. Add questions to your bank first.
          </p>
          <Button variant="outline" onClick={handleEndSession}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-mono font-semibold">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          {isTimerRunning && (
            <Badge variant="default" className="animate-pulse">
              Recording
            </Badge>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={handleEndSession}>
          <Square className="h-4 w-4 mr-2" />
          End Session
        </Button>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">
              {getCategoryLabel(currentQuestion.category)}
            </Badge>
            <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
              {currentQuestion.difficulty}
            </Badge>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mock-answer">Your Answer</Label>
            <Textarea
              id="mock-answer"
              placeholder="Type your answer here..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={8}
              disabled={hasSubmitted}
              className="resize-y"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          {!hasSubmitted ? (
            <Button onClick={handleSubmitAndRate} disabled={!userAnswer.trim()}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit &amp; Rate
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleNextQuestion}>
                <SkipForward className="h-4 w-4 mr-2" />
                Next Question
              </Button>
              <Button variant="secondary" onClick={handleEndSession}>
                End Session
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {hasSubmitted && (
        <Card className="border-green-300 dark:border-green-500/30 bg-green-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Answer submitted and practice recorded! Choose to continue with
              another question or end your session.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Answer</DialogTitle>
            <DialogDescription>
              How did you do on this question? Time spent:{" "}
              {formatTime(elapsedSeconds)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Confidence (1-10): {mockConfidence}</Label>
              <Input
                type="range"
                min={1}
                max={10}
                value={mockConfidence}
                onChange={(e) =>
                  setMockConfidence(parseInt(e.target.value, 10))
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Not confident</span>
                <span>10 - Very confident</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Self Rating (1-5): {mockSelfRating}</Label>
              <Input
                type="range"
                min={1}
                max={5}
                value={mockSelfRating}
                onChange={(e) =>
                  setMockSelfRating(parseInt(e.target.value, 10))
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Poor</span>
                <span>5 - Excellent</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRatingDialog(false);
                setIsTimerRunning(true);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRatingSubmit}
              disabled={practiceMutation.isPending}
            >
              {practiceMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================
   TAB 3: PROGRESS
   ================================================================ */

function ProgressTab() {
  const {
    data: progress,
    isLoading,
    isError,
  } = useQuery<InterviewProgress>({
    queryKey: ["interview-progress"],
    queryFn: async () => {
      const res = await api.get("/api/interview/progress");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !progress) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-destructive">
            Failed to load progress data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const masteredCount =
    progress.questionsByDifficulty?.EASY !== undefined
      ? Object.values(progress.questionsByDifficulty).reduce(
          (sum, val) => sum + val,
          0
        )
      : 0;
  const practicePercentage =
    progress.totalQuestions > 0
      ? Math.round((progress.practicedQuestions / progress.totalQuestions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Questions
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              In your question bank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Practiced</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.practicedQuestions}
            </div>
            <p className="text-xs text-muted-foreground">
              {practicePercentage}% of total questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Confidence
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.averageConfidence > 0
                ? progress.averageConfidence.toFixed(1)
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Out of 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Sessions
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.recentPractice?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Practice sessions logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practice Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Practice Progress</CardTitle>
          <CardDescription>
            {progress.practicedQuestions} of {progress.totalQuestions} questions
            practiced
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={practicePercentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {practicePercentage}% complete
          </p>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {progress.questionsByCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(progress.questionsByCategory).map(
                ([category, count]) => {
                  if (count === 0) return null;
                  const percentage =
                    progress.totalQuestions > 0
                      ? Math.round((count / progress.totalQuestions) * 100)
                      : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {getCategoryLabel(category as QuestionCategory)}
                        </span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                }
              )}
              {Object.values(progress.questionsByCategory).every(
                (count) => count === 0
              ) && (
                <p className="text-sm text-muted-foreground">
                  No category data available yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Difficulty Breakdown */}
      {progress.questionsByDifficulty && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DIFFICULTIES.map((diff) => {
                const count = progress.questionsByDifficulty[diff] ?? 0;
                return (
                  <div
                    key={diff}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <Badge className={getDifficultyColor(diff)}>{diff}</Badge>
                    <span className="text-lg font-semibold">{count}</span>
                    <span className="text-sm text-muted-foreground">
                      questions
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Practice Sessions */}
      {progress.recentPractice && progress.recentPractice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recent Practice Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress.recentPractice.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Question: {record.questionId.slice(0, 8)}...
                    </p>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {record.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">
                        Confidence: {record.confidenceRating}/10
                      </p>
                      {record.durationSeconds !== null && (
                        <p className="text-xs text-muted-foreground">
                          {formatTime(record.durationSeconds)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(record.practicedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
