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
  parentTopicId: string | null;
  subtopics: LearningTopic[];
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
  progressPercentage: number;
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
  questionText: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  tags: Tag[];
  answers: InterviewAnswer[];
  practiceCount: number;
  lastConfidenceScore: number | null;
  practiceStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewAnswer {
  id: string;
  answerText: string;
  keyPoints: string | null;
  exampleScenarios: string | null;
  mistakesToAvoid: string | null;
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
  digest: {
    notesModifiedToday: number;
    flashcardsDue: number;
    recentNotes: string[];
    summary: string;
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
// AI
// ============================================================

export type AiProviderType = "OLLAMA" | "OPENAI" | "GEMINI";

export interface AiSettings {
  id: string;
  activeProvider: AiProviderType;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiKeySet: boolean;
  openaiModel: string;
  geminiKeySet: boolean;
  geminiModel: string;
}

export interface AiConversation {
  id: string;
  title: string;
  context: string | null;
  messages?: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
}

export interface AiGenerateResponse {
  content: string;
  type: string;
}

// ============================================================
// Flashcards
// ============================================================

export type FlashcardState = 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
export type FlashcardRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  noteId: string | null;
  noteTitle: string | null;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: FlashcardState;
  stateLabel: string;
  lastReview: string | null;
  nextReview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardStats {
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  decks: string[];
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

// ============================================================
// Note Templates
// ============================================================

export interface NoteTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  contentJson: string | null;
  category: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Note Versions
// ============================================================

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string | null;
  contentJson: string | null;
  versionNumber: number;
  createdAt: string;
}

// ============================================================
// Canvas
// ============================================================

export interface CanvasNode {
  id: string;
  canvasId: string;
  noteId: string | null;
  noteTitle: string | null;
  label: string | null;
  content: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  nodeType: string;
  createdAt: string;
}

export interface CanvasEdge {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
}

// ============================================================
// Calendar Events
// ============================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  color: string | null;
  category: string;
  taskId: string | null;
  taskTitle: string | null;
  recurrenceRule: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Pomodoro
// ============================================================

export type PomodoroStatus = "COMPLETED" | "CANCELLED" | "IN_PROGRESS";

export interface PomodoroSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  durationMinutes: number;
  breakMinutes: number;
  status: PomodoroStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PomodoroStats {
  totalSessions: number;
  totalMinutes: number;
  averageMinutes: number;
  sessionsThisWeek: number;
}

// ============================================================
// Webhooks
// ============================================================

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Cross-Module Links / Smart Connections
// ============================================================

export interface CrossModuleLink {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceTitle: string | null;
  targetType: string;
  targetId: string;
  targetTitle: string | null;
  linkType: string;
  createdAt: string;
}

// ============================================================
// Analytics
// ============================================================

export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalNotes: number;
  totalFlashcards: number;
  flashcardsDue: number;
  totalHabits: number;
  habitCompletionRate: number;
  pomodoroSessionsThisWeek: number;
  totalFocusMinutes: number;
  currentStreak: number;
  longestStreak: number;
  dailyActivity: { date: string; tasks: number; notes: number; flashcards: number; pomodoros: number }[];
  weeklyTrends: { week: string; productivity: number; focusMinutes: number }[];
}
