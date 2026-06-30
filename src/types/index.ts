// ===== USER TYPES =====
export type UserMode = 'student' | 'professional' | 'entrepreneur';
export type WorkStyle = 'sprinter' | 'marathoner' | 'mixed';
export type MotivationType = 'encouragement' | 'pressure' | 'data-driven';
export type CommunicationStyle = 'casual' | 'professional' | 'minimal';
export type NotificationChannel = 'push' | 'email' | 'inApp';

export interface UserPersonality {
  workStyle: WorkStyle;
  motivationType: MotivationType;
  communicationStyle: CommunicationStyle;
  timezone: string;
  peakHours: number[];
}

export interface UserPreferences {
  gamificationEnabled: boolean;
  ghostWorkerEnabled: boolean;
  rescueModeEnabled: boolean;
  voiceEnabled: boolean;
  gmailEnabled?: boolean;
  calendarSyncEnabled?: boolean;
  notificationChannels: NotificationChannel[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  mode: UserMode;
  personality: UserPersonality;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  fcmToken?: string;
  createdAt: Date;
}

export interface UserGamification {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  badges: Badge[];
  tasksCompletedToday: number;
  totalTasksCompleted: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

// ===== TASK TYPES =====
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'overdue' | 'rescued';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date;
  estimatedMinutes: number;
  actualMinutes: number;
  category: string;
  tags: string[];
  subtasks: Subtask[];
  aiGenerated: boolean;
  parentGoalId: string | null;
  rescuePlan: RescuePlan | null;
  ghostWorkerOutput: GhostWorkerOutput | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ===== GOAL TYPES =====
export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: Date;
  progress: number;
  milestones: Milestone[];
  linkedTaskIds: string[];
  status: GoalStatus;
  createdAt: Date;
}

// ===== HABIT TYPES =====
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  frequency: HabitFrequency;
  completedDates: string[];
  streak: number;
  category: string;
}

// ===== AI TYPES =====
export type AgentType = 'core' | 'rescue' | 'ghost-worker' | 'timewarp' | 'accountability' | 'decomposer';
export type RescueSeverity = 'yellow' | 'orange' | 'red';

export interface RescuePlan {
  severity: RescueSeverity;
  totalMinutesAvailable: number;
  totalMinutesNeeded: number;
  feasible: boolean;
  plan: RescueStep[];
  sacrifices: string[];
  motivationalMessage: string;
  checkpoints: RescueCheckpoint[];
  activatedAt: Date;
  completedSteps: number;
}

export interface RescueStep {
  id: string;
  timeBlock: string;
  action: string;
  estimatedMinutes: number;
  tips: string;
  canBeSkipped: boolean;
  completed: boolean;
}

export interface RescueCheckpoint {
  time: string;
  milestone: string;
  reached: boolean;
}

export interface GhostWorkerOutput {
  type: 'email' | 'document' | 'presentation' | 'code' | 'agenda';
  title: string;
  content: string;
  generatedAt: Date;
  approved: boolean;
  edits: string | null;
}

export interface BottleneckForecast {
  date: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  taskCount: number;
  recommendedAction: string;
}

export interface ProductivityInsight {
  type: 'achievement' | 'warning' | 'recommendation' | 'pattern';
  title: string;
  description: string;
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
}

// ===== CHAT TYPES =====
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

// ===== ANALYTICS TYPES =====
export interface DailyAnalytics {
  date: string;
  tasksCompleted: number;
  tasksCreated: number;
  focusMinutes: number;
  rescueModeActivations: number;
  productivityScore: number;
  bottlenecksDetected: string[];
}

// ===== NOTIFICATION TYPES =====
export type NotificationType = 'deadline_approaching' | 'rescue_mode' | 'ghost_worker_ready' | 'streak' | 'achievement' | 'insight';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// ===== ONBOARDING TYPES =====
export interface OnboardingQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; icon: string; description: string }[];
  field: keyof UserPersonality | 'mode';
}

// ===== DEMO TYPES =====
export interface DemoState {
  isDemo: boolean;
  user: UserProfile | null;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  analytics: DailyAnalytics[];
  gamification: UserGamification;
  conversations: ChatMessage[];
}
