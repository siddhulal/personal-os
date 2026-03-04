// ============================================================
// Shared / Common Types
// ============================================================

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
  last: boolean;
}

// ============================================================
// Auth Types
// ============================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
}

// ============================================================
// Tag
// ============================================================

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// ============================================================
// Task
// ============================================================

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Project
// ============================================================

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  targetDate: string | null;
  tags: Tag[];
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Note
// ============================================================

export interface Note {
  id: string;
  title: string;
  content: string;
  contentJson: string | null;
  orderIndex: number;
  notebookId: string | null;
  sectionId: string | null;
  projectId: string | null;
  projectName: string | null;
  isDailyNote: boolean;
  dailyNoteDate: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  orderIndex: number;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  orderIndex: number;
  notebookId: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteLink {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  targetNoteId: string;
  targetNoteTitle: string;
}

export interface NoteGraph {
  nodes: { id: string; title: string }[];
  edges: { sourceId: string; targetId: string }[];
}

export interface NoteSuggestion {
  id: string;
  title: string;
}

// ============================================================
// Idea
// ============================================================

export type IdeaStatus = "CAPTURED" | "EXPLORING" | "VALIDATED" | "IN_PROGRESS" | "COMPLETED" | "DISCARDED";
export type IdeaCategory = "PROJECT" | "BUSINESS" | "CREATIVE" | "LEARNING" | "PERSONAL" | "OTHER";

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  category: IdeaCategory;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Goal
// ============================================================

export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
export type GoalTimeframe = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "LONG_TERM";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  timeframe: GoalTimeframe;
  targetDate: string | null;
  progress: number;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Learning Roadmap & Topics
// ============================================================

export type RoadmapStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED";
export type TopicStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface LearningTopic {
  id: string;
  title: string;
  description: string | null;
  status: TopicStatus;
  orderIndex: number;
  estimatedHours: number | null;
  actualHours: number | null;
  resources: string[];
  notes: string | null;
  roadmapId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningRoadmap {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  tags: Tag[];
  topics: LearningTopic[];
  totalTopics: number;
  completedTopics: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Skills
// ============================================================

export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: SkillLevel;
  confidenceScore: number;
  lastPracticed: string | null;
  notes: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Interview Prep
// ============================================================

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionCategory =
  | "BEHAVIORAL"
  | "TECHNICAL"
  | "SYSTEM_DESIGN"
  | "CODING"
  | "SITUATIONAL"
  | "OTHER";

export interface InterviewQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  company: string | null;
  role: string | null;
  tags: Tag[];
  answers: InterviewAnswer[];
  practiceCount: number;
  lastPracticedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewAnswer {
  id: string;
  content: string;
  isFavorite: boolean;
  questionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeRecord {
  id: string;
  questionId: string;
  confidenceRating: number;
  notes: string | null;
  durationSeconds: number | null;
  practicedAt: string;
}

// ============================================================
// Dashboard
// ============================================================

export interface DashboardData {
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  activeProjects: Project[];
  learningProgress: {
    totalTopics: number;
    completedTopics: number;
    progressPercentage: number;
    totalSkills: number;
    studySessionsThisWeek: number;
  };
  interviewProgress: {
    totalQuestions: number;
    masteredQuestions: number;
    practicedThisWeek: number;
    topicProgress: Record<string, number>;
  };
  habitProgress: {
    totalHabits: number;
    completedToday: number;
    todayTotal: number;
    bestStreak: number;
  } | null;
}

export interface LearningProgress {
  totalRoadmaps: number;
  activeRoadmaps: number;
  completedRoadmaps: number;
  totalTopics: number;
  completedTopics: number;
  totalSkills: number;
  skillsByLevel: Record<SkillLevel, number>;
  recentActivity: LearningTopic[];
}

export interface InterviewProgress {
  totalQuestions: number;
  practicedQuestions: number;
  averageConfidence: number;
  questionsByCategory: Record<QuestionCategory, number>;
  questionsByDifficulty: Record<QuestionDifficulty, number>;
  recentPractice: PracticeRecord[];
}

// ============================================================
// Habits
// ============================================================

export type HabitFrequency = "DAILY" | "WEEKLY" | "CUSTOM";

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  frequencyDays: number[] | null;
  category: string | null;
  color: string;
  icon: string;
  isMicroHabit: boolean;
  microHabitCue: string | null;
  reminderTime: string | null;
  targetCount: number;
  orderIndex: number;
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedDate: string;
  completedAt: string;
  value: number;
  notes: string | null;
}

export interface HabitStats {
  habitId: string;
  habitName: string;
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyData: { week: string; completions: number }[];
  monthlyData: { month: string; completions: number; totalDays: number; rate: number }[];
}

export interface HabitInsights {
  totalHabits: number;
  activeHabits: number;
  overallCompletionRate: number;
  totalCompletionsThisWeek: number;
  totalCompletionsThisMonth: number;
  topStreaks: HabitSummary[];
  bestPerforming: HabitSummary[];
  dailyRates: { date: string; rate: number; completed: number; total: number }[];
}

export interface HabitSummary {
  habitId: string;
  name: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

// ============================================================
// Search
// ============================================================

export interface SearchResults {
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  ideas: Idea[];
  goals: Goal[];
  roadmaps: LearningRoadmap[];
  questions: InterviewQuestion[];
}
