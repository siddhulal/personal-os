"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
import { AppShell } from "@/components/layout/app-shell";
import { QuickAdd } from "@/components/shared/quick-add";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare,
  AlertTriangle,
  Calendar,
  FolderKanban,
  GraduationCap,
  MessageSquare,
  Repeat,
  Flame,
  Sparkles,
  Layers,
  FileText,
  Sun,
  Focus,
} from "lucide-react";
import Link from "next/link";
import { DashboardData } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard/summary");
      return res.data;
    },
  });

  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const dashRef = useRef(dashboard);
  dashRef.current = dashboard;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Morning Briefing",
        action: "morning_briefing",
        icon: Sun,
        onAction: () => {
          const d = dashRef.current;
          const todayCount = d?.todayTasks?.length ?? 0;
          const overdueCount = d?.overdueTasks?.length ?? 0;
          const habitsCompleted = d?.habitProgress?.completedToday ?? 0;
          const habitsTotal = d?.habitProgress?.totalHabits ?? 0;
          const taskList = (d?.todayTasks ?? []).slice(0, 8)
            .map((t) => `- [${t.priority}] ${t.title}`).join("\n");
          const overdueList = (d?.overdueTasks ?? []).slice(0, 5)
            .map((t) => `- ${t.title} (due ${t.dueDate?.split("T")[0] ?? "?"})`).join("\n");
          openChat(
            `Give me a morning briefing for today.\n\nToday's tasks (${todayCount}):\n${taskList || "None"}\n\nOverdue tasks (${overdueCount}):\n${overdueList || "None"}\n\nHabits: ${habitsCompleted}/${habitsTotal} completed today\n\nPlease summarize my day, highlight priorities, and suggest a plan of action.`
          );
        },
      },
      {
        label: "What Should I Focus On?",
        action: "focus_suggestion",
        icon: Focus,
        onAction: () => {
          const d = dashRef.current;
          const tasks = [...(d?.overdueTasks ?? []), ...(d?.todayTasks ?? [])].slice(0, 10)
            .map((t) => `- [${t.priority}/${t.status}] ${t.title}`).join("\n");
          const projects = (d?.activeProjects ?? []).slice(0, 5)
            .map((p) => `- ${p.name} (${p.status})`).join("\n");
          openChat(
            `Based on my current workload, what should I focus on right now?\n\nOpen tasks:\n${tasks || "None"}\n\nActive projects:\n${projects || "None"}\n\nPlease suggest the single most impactful thing I should work on and explain why.`
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s on your plate today
          </p>
        </div>

        {/* Quick Add */}
        <QuickAdd />

        {/* Dashboard Grid */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : dashboard ? (
          <>
          {/* Daily Digest */}
          {dashboard.digest && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Daily Digest
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{dashboard.digest.summary}</p>
                <div className="flex flex-wrap gap-3">
                  {dashboard.digest.flashcardsDue > 0 && (
                    <Link
                      href="/flashcards"
                      className="inline-flex items-center gap-1.5 text-xs bg-background/80 px-3 py-1.5 rounded-full border hover:bg-background transition-colors"
                    >
                      <Layers className="h-3 w-3 text-orange-500" />
                      {dashboard.digest.flashcardsDue} cards to review
                    </Link>
                  )}
                  {dashboard.digest.notesModifiedToday > 0 && (
                    <Link
                      href="/notes"
                      className="inline-flex items-center gap-1.5 text-xs bg-background/80 px-3 py-1.5 rounded-full border hover:bg-background transition-colors"
                    >
                      <FileText className="h-3 w-3 text-blue-500" />
                      {dashboard.digest.notesModifiedToday} notes edited today
                    </Link>
                  )}
                </div>
                {dashboard.digest.recentNotes.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Recent: {dashboard.digest.recentNotes.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/tasks" className="text-sm font-medium hover:underline">
                  Today&apos;s Tasks
                </Link>
                <Link href="/tasks">
                  <CheckSquare className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </CardHeader>
              <CardContent>
                {dashboard.todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tasks for today
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.todayTasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        href="/tasks"
                        className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            task.priority === "HIGH"
                              ? "bg-destructive"
                              : task.priority === "MEDIUM"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    ))}
                    {dashboard.todayTasks.length > 5 && (
                      <Link href="/tasks" className="text-xs text-muted-foreground hover:underline block">
                        +{dashboard.todayTasks.length - 5} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/tasks" className="text-sm font-medium hover:underline">Overdue</Link>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {dashboard.overdueTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All caught up!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.overdueTasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        href="/tasks"
                        className="flex items-center gap-2 text-sm text-destructive hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    ))}
                    {dashboard.overdueTasks.length > 5 && (
                      <Link href="/tasks" className="text-xs text-muted-foreground hover:underline block">
                        +{dashboard.overdueTasks.length - 5} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/tasks" className="text-sm font-medium hover:underline">
                  Upcoming (7 days)
                </Link>
                <Link href="/calendar">
                  <Calendar className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </CardHeader>
              <CardContent>
                {dashboard.upcomingTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing upcoming
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.upcomingTasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        href="/tasks"
                        className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                      >
                        <span className="truncate">{task.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {task.dueDate}
                        </span>
                      </Link>
                    ))}
                    {dashboard.upcomingTasks.length > 5 && (
                      <Link href="/tasks" className="text-xs text-muted-foreground hover:underline block">
                        +{dashboard.upcomingTasks.length - 5} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/projects" className="text-sm font-medium hover:underline">
                  Active Projects
                </Link>
                <Link href="/projects">
                  <FolderKanban className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </CardHeader>
              <CardContent>
                {dashboard.activeProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active projects
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.activeProjects.slice(0, 4).map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between hover:bg-muted/50 rounded px-1 py-1 -mx-1 transition-colors">
                        <span className="text-sm font-medium truncate">
                          {project.name}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                          {project.taskCount} tasks
                        </Badge>
                      </Link>
                    ))}
                    {dashboard.activeProjects.length > 4 && (
                      <Link href="/projects" className="text-xs text-muted-foreground hover:underline block">
                        +{dashboard.activeProjects.length - 4} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/learning" className="text-sm font-medium hover:underline">
                  Learning Progress
                </Link>
                <Link href="/learning">
                  <GraduationCap className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Topics Completed</span>
                    <span>
                      {dashboard.learningProgress.completedTopics}/
                      {dashboard.learningProgress.totalTopics}
                    </span>
                  </div>
                  <Progress
                    value={dashboard.learningProgress.progressPercentage}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Skills tracked</span>
                  <span>{dashboard.learningProgress.totalSkills}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Study sessions this week
                  </span>
                  <span>
                    {dashboard.learningProgress.studySessionsThisWeek}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Interview Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Link href="/interview" className="text-sm font-medium hover:underline">
                  Interview Prep
                </Link>
                <Link href="/interview">
                  <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Questions
                  </span>
                  <span>{dashboard.interviewProgress.totalQuestions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mastered</span>
                  <span className="text-green-600">
                    {dashboard.interviewProgress.masteredQuestions}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Practiced this week
                  </span>
                  <span>{dashboard.interviewProgress.practicedThisWeek}</span>
                </div>
              </CardContent>
            </Card>

            {/* Habits Progress */}
            {dashboard.habitProgress && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Link href="/habits" className="text-sm font-medium hover:underline">
                    Habits
                  </Link>
                  <Link href="/habits">
                    <Repeat className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Today&apos;s Progress</span>
                      <span>
                        {dashboard.habitProgress.completedToday}/
                        {dashboard.habitProgress.todayTotal}
                      </span>
                    </div>
                    <Progress
                      value={
                        dashboard.habitProgress.todayTotal > 0
                          ? (dashboard.habitProgress.completedToday /
                              dashboard.habitProgress.todayTotal) *
                            100
                          : 0
                      }
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active habits</span>
                    <span>{dashboard.habitProgress.totalHabits}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      Best streak
                    </span>
                    <span className="text-orange-500 font-medium">
                      {dashboard.habitProgress.bestStreak} days
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load dashboard data. Please try refreshing.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
