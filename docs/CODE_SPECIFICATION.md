# Chronos — Complete Code Specification

> This document is the **code-level companion** to `implementation_plan.md`. It contains every detail needed for an AI coding assistant to generate the **complete, working codebase** for Chronos.

---

## Table of Contents

1. [Project Initialization](#1-project-initialization)
2. [Complete Design System CSS](#2-complete-design-system-css)
3. [TypeScript Type Definitions](#3-typescript-type-definitions)
4. [Firebase Configuration](#4-firebase-configuration)
5. [Authentication System](#5-authentication-system)
6. [Gemini AI Client & Agent System](#6-gemini-ai-client--agent-system)
7. [API Route Specifications](#7-api-route-specifications)
8. [UI Component Specifications](#8-ui-component-specifications)
9. [Page Specifications](#9-page-specifications)
10. [Hooks Specifications](#10-hooks-specifications)
11. [Demo Mode System](#11-demo-mode-system)
12. [PWA & Notifications](#12-pwa--notifications)
13. [Deployment Configuration](#13-deployment-configuration)
14. [Error Handling Patterns](#14-error-handling-patterns)
15. [State Management Patterns](#15-state-management-patterns)

---

## 1. Project Initialization

### Commands to Run
```bash
npx -y create-next-app@latest ./ --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --no-turbopack
npm install @google/genai firebase firebase-admin next-auth googleapis zod framer-motion recharts date-fns lucide-react uuid
npm install -D @types/uuid
```

### tsconfig.json Modifications
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### next.config.js — Complete
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};
module.exports = nextConfig;
```

### .env.local — Complete Template
```env
# === Gemini Vertex AI ===
VERTEX_PROJECT_ID=your_gcp_project_id_here
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_APPLICATION_CREDENTIALS_JSON=
GEMINI_MODEL_FLASH=gemini-2.5-flash
GEMINI_MODEL_PRO=gemini-2.5-pro

# === Firebase Client ===
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# === Firebase Admin (base64-encoded service account JSON) ===
FIREBASE_SERVICE_ACCOUNT_KEY=

# === Google OAuth (from Google Cloud Console) ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# === NextAuth ===
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# === FCM ===
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

---

## 2. Complete Design System CSS

### File: `src/app/globals.css`

```css
/* ========================================
   CHRONOS DESIGN SYSTEM
   Theme: Dark Cyberpunk with Neon Accents
   ======================================== */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

/* === CSS CUSTOM PROPERTIES === */
:root {
  /* Background Colors */
  --bg-primary: #07070d;
  --bg-secondary: #0e0e18;
  --bg-tertiary: #151524;
  --bg-elevated: #1c1c32;
  --bg-hover: #22223a;
  
  /* Neon Accent Colors */
  --neon-cyan: #00e5ff;
  --neon-cyan-dim: #00a3b4;
  --neon-cyan-glow: rgba(0, 229, 255, 0.3);
  --neon-cyan-subtle: rgba(0, 229, 255, 0.08);
  
  --neon-purple: #a855f7;
  --neon-purple-dim: #7c3aed;
  --neon-purple-glow: rgba(168, 85, 247, 0.3);
  --neon-purple-subtle: rgba(168, 85, 247, 0.08);
  
  --neon-pink: #ec4899;
  --neon-pink-dim: #db2777;
  --neon-pink-glow: rgba(236, 72, 153, 0.3);
  --neon-pink-subtle: rgba(236, 72, 153, 0.08);
  
  --neon-green: #22c55e;
  --neon-green-dim: #16a34a;
  --neon-green-glow: rgba(34, 197, 94, 0.3);
  --neon-green-subtle: rgba(34, 197, 94, 0.08);
  
  --neon-amber: #f59e0b;
  --neon-amber-dim: #d97706;
  --neon-amber-glow: rgba(245, 158, 11, 0.3);
  --neon-amber-subtle: rgba(245, 158, 11, 0.08);
  
  --neon-red: #ef4444;
  --neon-red-glow: rgba(239, 68, 68, 0.3);
  
  /* Text Colors */
  --text-primary: #f0f0f5;
  --text-secondary: #a0a0b8;
  --text-tertiary: #6b6b82;
  --text-disabled: #3d3d54;
  
  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 20px;
  
  /* Spacing Scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
  
  /* Typography Scale */
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Orbitron', sans-serif;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.8125rem;  /* 13px */
  --text-base: 0.875rem; /* 14px */
  --text-md: 1rem;       /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  --text-6xl: 3.75rem;   /* 60px */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.6);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Z-Index Scale */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-sidebar: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-command-palette: 600;
  --z-tooltip: 700;
}

/* === RESET & BASE === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Animated background grid */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: -1;
}

a { color: var(--neon-cyan); text-decoration: none; }
a:hover { text-decoration: underline; }

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--neon-cyan-dim); }

/* === SELECTION === */
::selection { background: var(--neon-cyan-glow); color: var(--text-primary); }

/* === GLASS CARD === */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: all var(--transition-base);
}

.glass-card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* === NEON BORDERS === */
.neon-border-cyan { border: 1px solid var(--neon-cyan); box-shadow: 0 0 10px var(--neon-cyan-glow), inset 0 0 10px var(--neon-cyan-subtle); }
.neon-border-purple { border: 1px solid var(--neon-purple); box-shadow: 0 0 10px var(--neon-purple-glow), inset 0 0 10px var(--neon-purple-subtle); }
.neon-border-pink { border: 1px solid var(--neon-pink); box-shadow: 0 0 10px var(--neon-pink-glow), inset 0 0 10px var(--neon-pink-subtle); }
.neon-border-green { border: 1px solid var(--neon-green); box-shadow: 0 0 10px var(--neon-green-glow), inset 0 0 10px var(--neon-green-subtle); }

/* === NEON TEXT === */
.neon-text-cyan { color: var(--neon-cyan); text-shadow: 0 0 10px var(--neon-cyan-glow); }
.neon-text-purple { color: var(--neon-purple); text-shadow: 0 0 10px var(--neon-purple-glow); }
.neon-text-pink { color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink-glow); }
.neon-text-green { color: var(--neon-green); text-shadow: 0 0 10px var(--neon-green-glow); }

/* === GLOW BUTTON === */
.glow-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border: 1px solid var(--neon-cyan);
  border-radius: var(--radius-md);
  background: var(--neon-cyan-subtle);
  color: var(--neon-cyan);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.glow-button:hover {
  background: rgba(0, 229, 255, 0.15);
  box-shadow: 0 0 20px var(--neon-cyan-glow), 0 0 40px rgba(0, 229, 255, 0.1);
  transform: translateY(-1px);
  text-decoration: none;
}

.glow-button:active { transform: translateY(0); }

.glow-button--purple { border-color: var(--neon-purple); color: var(--neon-purple); background: var(--neon-purple-subtle); }
.glow-button--purple:hover { background: rgba(168, 85, 247, 0.15); box-shadow: 0 0 20px var(--neon-purple-glow); }

.glow-button--pink { border-color: var(--neon-pink); color: var(--neon-pink); background: var(--neon-pink-subtle); }
.glow-button--pink:hover { background: rgba(236, 72, 153, 0.15); box-shadow: 0 0 20px var(--neon-pink-glow); }

.glow-button--green { border-color: var(--neon-green); color: var(--neon-green); background: var(--neon-green-subtle); }
.glow-button--green:hover { background: rgba(34, 197, 94, 0.15); box-shadow: 0 0 20px var(--neon-green-glow); }

.glow-button--solid {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: var(--bg-primary);
  border: none;
  font-weight: 700;
}

.glow-button--solid:hover {
  box-shadow: 0 0 30px var(--neon-cyan-glow), 0 0 60px var(--neon-purple-glow);
}

/* === INPUT FIELDS === */
.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  transition: all var(--transition-base);
  outline: none;
}

.input-field::placeholder { color: var(--text-tertiary); }

.input-field:focus {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 3px var(--neon-cyan-subtle);
}

/* === KEYFRAME ANIMATIONS === */
@keyframes pulse-neon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 5px var(--neon-cyan-glow); }
  50% { box-shadow: 0 0 20px var(--neon-cyan-glow), 0 0 40px rgba(0, 229, 255, 0.1); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes border-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes rescue-pulse {
  0%, 100% { box-shadow: 0 0 5px var(--neon-pink-glow); border-color: var(--neon-pink); }
  50% { box-shadow: 0 0 30px var(--neon-pink-glow), 0 0 60px rgba(236, 72, 153, 0.15); border-color: var(--neon-red); }
}

@keyframes countdown-tick {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Utility classes */
.animate-pulse-neon { animation: pulse-neon 2s ease-in-out infinite; }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-glow { animation: glow-pulse 2s ease-in-out infinite; }
.animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
.animate-slide-right { animation: slide-in-right 0.5s ease-out forwards; }
.animate-rescue { animation: rescue-pulse 1.5s ease-in-out infinite; }

.shimmer-bg {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* === LAYOUT UTILITIES === */
.container { max-width: 1400px; margin: 0 auto; padding: 0 var(--space-6); }
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }
.grid { display: grid; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.relative { position: relative; }
.absolute { position: absolute; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* === RESPONSIVE GRID === */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 1024px) {
  .dashboard-grid { grid-template-columns: 2fr 1fr; }
}

@media (min-width: 1280px) {
  .dashboard-grid { grid-template-columns: 2.5fr 1fr; }
}

/* === PRIORITY COLORS === */
.priority-critical { color: var(--neon-red); }
.priority-high { color: var(--neon-pink); }
.priority-medium { color: var(--neon-amber); }
.priority-low { color: var(--neon-green); }

.priority-bar-critical { background: var(--neon-red); }
.priority-bar-high { background: var(--neon-pink); }
.priority-bar-medium { background: var(--neon-amber); }
.priority-bar-low { background: var(--neon-green); }

/* === BADGE === */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge--cyan { background: var(--neon-cyan-subtle); color: var(--neon-cyan); border: 1px solid rgba(0, 229, 255, 0.2); }
.badge--purple { background: var(--neon-purple-subtle); color: var(--neon-purple); border: 1px solid rgba(168, 85, 247, 0.2); }
.badge--pink { background: var(--neon-pink-subtle); color: var(--neon-pink); border: 1px solid rgba(236, 72, 153, 0.2); }
.badge--green { background: var(--neon-green-subtle); color: var(--neon-green); border: 1px solid rgba(34, 197, 94, 0.2); }
.badge--amber { background: var(--neon-amber-subtle); color: var(--neon-amber); border: 1px solid rgba(245, 158, 11, 0.2); }
```

This CSS file should be approximately 350-400 lines. The above covers ALL the design tokens, utilities, and component styles needed.

---

## 3. TypeScript Type Definitions

### File: `src/types/index.ts`

```typescript
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
```

---

## 4. Firebase Configuration

### File: `src/lib/firebase.ts` — Client-Side

```typescript
// Initialize Firebase app (client-side)
// Import: initializeApp, getApps from 'firebase/app'
// Import: getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged from 'firebase/auth'
// Import: getFirestore from 'firebase/firestore'
// Import: getMessaging, getToken, onMessage from 'firebase/messaging'

// Config object from NEXT_PUBLIC_ env vars
// Use getApps().length === 0 check before initializing
// Export: app, auth, db (firestore), messaging (lazy init, only in browser)
// Export: googleProvider = new GoogleAuthProvider() with scopes:
//   - 'https://www.googleapis.com/auth/calendar'
//   - 'https://www.googleapis.com/auth/gmail.send'
//   - 'https://www.googleapis.com/auth/tasks'
// Export: signInWithGoogle = () => signInWithPopup(auth, googleProvider)
// Export: logOut = () => signOut(auth)
```

### File: `src/lib/firebase-admin.ts` — Server-Side

```typescript
// Initialize Firebase Admin SDK (server-side only)
// Import: initializeApp, getApps, cert from 'firebase-admin/app'
// Import: getFirestore from 'firebase-admin/firestore'
// Import: getMessaging from 'firebase-admin/messaging'

// Decode FIREBASE_SERVICE_ACCOUNT_KEY from base64
// Use getApps().length === 0 check before initializing
// Export: adminDb (Firestore), adminMessaging
```

---

## 5. Authentication System

### File: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
// NextAuth configuration with Google OAuth provider
// 
// Provider: GoogleProvider with:
//   clientId: process.env.GOOGLE_CLIENT_ID
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET
//   authorization: {
//     params: {
//       prompt: 'consent',
//       access_type: 'offline',
//       response_type: 'code',
//       scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/tasks'
//     }
//   }
//
// Callbacks:
//   jwt: Store access_token, refresh_token, expires_at, and Google profile info
//   session: Attach access_token and user info to session
//
// On first sign-in (signIn callback):
//   - Check if user exists in Firestore users/{userId}
//   - If not, create user document with default profile
//   - Set onboardingCompleted: false
//
// Token refresh logic:
//   - Check if expires_at < Date.now()
//   - If expired, use refresh_token to get new access_token from Google
//   - Update token in JWT
```

### File: `src/contexts/AuthContext.tsx`

```typescript
// React Context wrapping NextAuth SessionProvider + Firebase Auth state
//
// Provides:
//   user: UserProfile | null
//   loading: boolean
//   isDemo: boolean
//   signIn: () => Promise<void>
//   signOut: () => Promise<void>
//   startDemo: () => void  // Sets demo mode
//
// On auth state change:
//   - Fetch user profile from Firestore
//   - If onboardingCompleted is false, redirect to /onboarding
//   - Store user profile in context state
```

---

## 6. Gemini AI Client & Agent System

### File: `src/lib/ai/gemini-client.ts`

```typescript
import { GoogleGenAI } from '@google/genai';

// Initialize: 
// const ai = new GoogleGenAI({
//   vertexai: true,
//   project: process.env.VERTEX_PROJECT_ID,
//   location: process.env.VERTEX_LOCATION || 'global',
// });
//
// Export function getModelName(type: 'flash' | 'pro'):
//   return type === 'flash' 
//     ? (process.env.GEMINI_MODEL_FLASH || 'gemini-3.5-flash') 
//     : (process.env.GEMINI_MODEL_PRO || 'gemini-3.1-pro');
//
// Export function createAgentChat(agentType, userProfile, conversationHistory):
//   Returns a chat session (using model.startChat) with the appropriate system instruction
//   and tool declarations based on agent type
```

### File: `src/lib/ai/tools.ts` — Complete Tool Definitions

```typescript
// All tool (function) declarations for Gemini function calling.
// Each tool has: name, description, parameters (JSON Schema).
//
// TOOL LIST:
//
// 1. createTask
//    params: { title: string, description: string, priority: 'critical'|'high'|'medium'|'low',
//              deadline: string (ISO), estimatedMinutes: number, category: string, tags: string[] }
//    description: "Create a new task for the user"
//
// 2. updateTask
//    params: { taskId: string, updates: { status?, priority?, title?, description?, deadline? } }
//    description: "Update an existing task"
//
// 3. completeTask
//    params: { taskId: string }
//    description: "Mark a task as completed"
//
// 4. deleteTask
//    params: { taskId: string }
//    description: "Delete a task"
//
// 5. listTasks
//    params: { filter?: { status?, priority?, dueBefore? }, limit?: number }
//    description: "List user's tasks with optional filters"
//
// 6. getUpcomingDeadlines
//    params: { hoursAhead: number }
//    description: "Get tasks with deadlines in the next N hours"
//
// 7. activateRescueMode
//    params: { taskId: string }
//    description: "Activate Rescue Mode for a task approaching its deadline"
//
// 8. generateGhostWorkerDraft
//    params: { taskId: string, deliverableType: 'email'|'document'|'presentation'|'code'|'agenda',
//              additionalContext?: string }
//    description: "Generate a draft deliverable for a task using Ghost Worker"
//
// 9. decomposeGoal
//    params: { goalTitle: string, goalDescription: string, deadline: string, context?: string }
//    description: "Break down a high-level goal into actionable tasks with estimates"
//
// 10. getProductivityInsights
//     params: { timeRange: 'today'|'week'|'month' }
//     description: "Get AI-generated productivity insights and analytics"
//
// 11. getBottleneckForecast
//     params: { daysAhead: number }
//     description: "Predict upcoming bottlenecks based on task load and past patterns"
//
// 12. createCalendarEvent
//     params: { title: string, startTime: string, endTime: string, description?: string }
//     description: "Create a Google Calendar event"
//
// 13. createGoal
//     params: { title: string, description: string, deadline: string }
//     description: "Create a new goal"
//
// 14. logHabitCompletion
//     params: { habitId: string }
//     description: "Log a habit as completed for today"
```

### File: `src/lib/ai/tool-executor.ts` — Tool Execution Engine

```typescript
// Executes tool calls returned by Gemini and returns results
//
// function executeToolCall(toolName: string, args: any, userId: string, session: any):
//   switch(toolName):
//     case 'createTask': → Write to Firestore users/{userId}/tasks/{newId}
//                          Return { success: true, taskId, message: "Task created: {title}" }
//     case 'updateTask': → Update Firestore document
//     case 'completeTask': → Update status to 'completed', set completedAt, award XP
//     case 'deleteTask': → Delete from Firestore
//     case 'listTasks': → Query Firestore with filters, return formatted list
//     case 'getUpcomingDeadlines': → Query where deadline < now + hoursAhead
//     case 'activateRescueMode': → Call rescue agent, return rescue plan
//     case 'generateGhostWorkerDraft': → Call ghost worker agent, return draft
//     case 'decomposeGoal': → Call decomposer agent, create tasks
//     case 'getProductivityInsights': → Query analytics, call timewarp agent
//     case 'getBottleneckForecast': → Call timewarp agent with analytics data
//     case 'createCalendarEvent': → Use googleapis with user's access_token
//     case 'createGoal': → Write to Firestore users/{userId}/goals/{newId}
//     case 'logHabitCompletion': → Update habit's completedDates array, update streak
```

### File: `src/lib/ai/agents/core-agent.ts`

Complete system prompt for the Core Agent:

```
You are **Chronos**, an AI Time Guardian built to rescue users from missed deadlines. 
You are NOT a passive assistant — you are a proactive, autonomous agent.

## Your Identity
- Name: Chronos
- Role: AI Time Guardian
- Personality: Adaptive based on user profile

## Current User Context
- Name: {{userName}}
- Mode: {{userMode}} (student/professional/entrepreneur)
- Work Style: {{workStyle}} — {{workStyleDescription}}
- Motivation Type: {{motivationType}} — {{motivationDescription}}
- Communication Style: {{communicationStyle}}
- Current Date/Time: {{currentDateTime}}
- Timezone: {{timezone}}

## Work Style Descriptions
- sprinter: Works best in intense, short bursts. Prefers tight deadlines.
- marathoner: Prefers steady, consistent progress over longer periods.
- mixed: Alternates between sprint and marathon based on task type.

## Motivation Descriptions
- encouragement: Responds well to praise, positive reinforcement, celebrating small wins.
- pressure: Works best under urgency. Direct, no-nonsense communication. Remind of consequences.
- data-driven: Motivated by metrics, progress stats, and objective analysis.

## Communication Styles
- casual: Use friendly, conversational tone. Emojis OK. First-name basis.
- professional: Formal but warm. Structured responses. Business-appropriate.
- minimal: Brief, to-the-point. No fluff. Bullet points preferred.

## Behavioral Rules
1. ALWAYS check for approaching deadlines at the start of conversations. If any task has a deadline within 6 hours, mention it immediately.
2. When a user expresses stress or says "I'm behind" / "I can't finish" / "running out of time", IMMEDIATELY suggest activating Rescue Mode via the activateRescueMode tool.
3. When a user says they need to write/draft something, offer Ghost Worker.
4. When creating tasks, ALWAYS set realistic time estimates based on the task description.
5. Proactively suggest task prioritization when the user has 5+ active tasks.
6. Never say "I can't do that." Instead, use your tools to help.
7. Keep responses concise but actionable. End with a clear next step.
8. If the user has a goal, check progress and suggest next actions.
9. Celebrate task completions with appropriate enthusiasm (based on motivation type).
10. Reference previous context to show you remember the user's situation.

## Tool Usage Guidelines
- Use createTask when the user mentions something they need to do
- Use listTasks when you need context about the user's current workload
- Use getUpcomingDeadlines at conversation start to be proactive
- Use activateRescueMode when deadline is approaching AND user seems behind
- Use decomposeGoal when user mentions a large, complex objective
- Use getProductivityInsights when user asks about their performance
- Use createCalendarEvent when discussing scheduling
```

### File: `src/lib/ai/agents/rescue-agent.ts`

Complete system prompt for the Rescue Agent:

```
You are the Rescue Mode module of Chronos, the AI Time Guardian.
Your job is to create COMPRESSED ACTION PLANS when a user is about to miss a deadline.

## Input You Will Receive
- Task title, description, and all subtasks
- Deadline (exact date/time)
- Current date/time
- Time remaining
- User's work style and motivation type
- Any completed subtasks

## Your Output Must Include
1. Severity assessment (yellow/orange/red based on time remaining)
2. A minute-by-minute action plan with specific time blocks
3. What can be skipped or simplified
4. Motivational message tailored to user's motivation type
5. Checkpoints to verify progress

## Rules
- Be REALISTIC about time estimates. Don't compress 4 hours of work into 30 minutes.
- If the plan is NOT feasible (time needed > time available), say so honestly, but still provide the BEST POSSIBLE plan.
- Time blocks should be no longer than 30 minutes each.
- Include 5-minute breaks every 60 minutes.
- Sacrifices should be ordered by impact (least impactful first).
- The motivational message should match the user's motivationType.

## Severity Levels
- yellow: 4-6 hours remaining. Manageable with focus.
- orange: 1-4 hours remaining. Tight. Some sacrifices needed.
- red: <1 hour remaining. Emergency mode. Maximum compression.
```

### File: `src/lib/ai/agents/ghost-worker-agent.ts`

Complete system prompt for the Ghost Worker Agent:

```
You are the Ghost Worker module of Chronos, the AI Time Guardian.
Your job is to autonomously draft deliverables for the user.

## Deliverable Types
1. **email**: Draft professional emails based on task context
2. **document**: Create document outlines or full drafts
3. **presentation**: Generate presentation slide structures
4. **code**: Write code boilerplate or implementations
5. **agenda**: Create meeting agendas

## Rules
- Use the user's communication style from their profile
- If the user is a student, adjust formality appropriately
- If the user is a professional, use business-appropriate language
- Always include [PLACEHOLDER] markers for specific details you don't know
- Structure all outputs with clear sections and formatting
- Include a "Review Notes" section at the end with suggestions for the user

## Output Format
Always return your draft as a structured object with:
- type: the deliverable type
- title: a descriptive title
- content: the full draft content in Markdown format
- reviewNotes: array of suggestions for the user to review
```

### File: `src/lib/ai/agents/timewarp-agent.ts`

```
You are the Time Warp Analyzer module of Chronos.
You analyze productivity data and predict future bottlenecks.

## Input Data
- Array of DailyAnalytics objects (up to 30 days)
- Current task list with deadlines
- User's work patterns (peak hours, work style)

## Analysis Required
1. **Pattern Detection**: Identify recurring patterns:
   - Days of the week with low productivity
   - Times when tasks are most often completed
   - Procrastination patterns (tasks completed near deadline)
   
2. **Bottleneck Prediction**: For each of the next 7 days:
   - Count tasks due
   - Estimate required hours based on task estimates
   - Compare to user's typical available hours
   - Flag days where demand exceeds capacity

3. **Insights Generation**: Create 3-5 actionable insights:
   - Achievements worth celebrating
   - Warnings about upcoming crunch
   - Recommendations for optimization
   - Observed patterns

## Output Format
Return as structured JSON with:
- forecasts: array of BottleneckForecast objects
- insights: array of ProductivityInsight objects
- weeklyReport: string (markdown summary)
```

### File: `src/lib/ai/agents/accountability-agent.ts`

```
You are the Accountability Partner module of Chronos.
You adapt your communication style based on the user's personality profile.

## Personality Modes

### Encourager Mode (motivationType: 'encouragement')
- Use positive reinforcement: "You're doing great!"
- Celebrate every small win: "🎉 Another task down! You're on fire!"
- Frame challenges positively: "This is a great opportunity to push yourself"
- Use encouraging emojis: 🌟 💪 🎯 ✨ 🏆

### Drill Sergeant Mode (motivationType: 'pressure')
- Be direct and urgent: "You have 3 hours. No excuses. Start NOW."
- Use consequences: "If you don't start this in the next 30 minutes, you WILL miss the deadline."
- Challenge the user: "Are you really going to let this beat you?"
- No sugarcoating: "You're behind schedule. Here's what you need to do."
- Use urgent emojis: ⚠️ 🔥 ⏰ 🚨

### Data Analyst Mode (motivationType: 'data-driven')
- Lead with metrics: "Your velocity this week: 4.2 tasks/day. Target: 5.0."
- Use percentages: "You're 73% done. At current pace, completion ETA: 2:30 PM."
- Provide comparisons: "This is 15% better than last week."
- Objective tone: "Based on historical data, the optimal time to start is now."
- Use data emojis: 📊 📈 🎯 ⏱️

## Escalation Rules
- As deadline approaches, INCREASE intensity regardless of mode
- For Encourager: Add gentle urgency ("I believe in you, but we need to pick up the pace!")
- For Drill Sergeant: Peak intensity ("THIS IS IT. NOW OR NEVER.")
- For Data Analyst: Add risk metrics ("Risk of missing deadline: 78%. Action required.")
```

### File: `src/lib/ai/agents/decomposer-agent.ts`

```
You are the Smart Decomposition module of Chronos.
You break down high-level goals into actionable, estimatable micro-tasks.

## Input
- Goal title and description
- Overall deadline
- User's mode (student/professional/entrepreneur)
- Optional: additional context

## Process
1. Identify major milestones (3-7 milestones per goal)
2. Break each milestone into specific tasks (2-5 tasks per milestone)
3. Estimate time for each task based on complexity
4. Identify dependencies between tasks
5. Distribute deadlines evenly, backloaded from the final deadline
6. Assign priorities based on dependency order

## Rules
- Tasks should be completable in 15-120 minutes each
- Milestone deadlines should be distributed to avoid last-minute crunch
- Always include buffer time (add 20% to total estimates)
- Consider the user's mode:
  - Student: Include study sessions, review periods, practice
  - Professional: Include review cycles, stakeholder check-ins
  - Entrepreneur: Include market research, iteration cycles

## Output Format
Return structured JSON with:
- milestones: array of Milestone objects with due dates
- tasks: array of Task objects linked to milestones
- totalEstimatedHours: number
- criticalPath: array of task IDs showing the longest dependency chain
- suggestedSchedule: string describing the recommended work pattern
```

---

## 7. API Route Specifications

### File: `src/app/api/ai/chat/route.ts`

```typescript
// POST /api/ai/chat
// 
// Request body:
// {
//   message: string,
//   conversationId?: string,  // For continuing a conversation
//   userId: string
// }
//
// Response: ReadableStream (Server-Sent Events for streaming)
//
// Implementation:
// 1. Authenticate request (get session)
// 2. Fetch user profile from Firestore
// 3. Fetch conversation history from Firestore (if conversationId provided)
// 4. Create Gemini chat session with core-agent system prompt
//    - Inject user profile values into system prompt template
//    - Attach all tool declarations from tools.ts
//    - Include conversation history
// 5. Send user message to Gemini
// 6. Handle response in a loop:
//    a. If response contains text → stream it to client via SSE
//    b. If response contains function calls → 
//       - Execute each function call via tool-executor.ts
//       - Send function results back to Gemini
//       - Continue loop for next response
//    c. If response is finished → close stream
// 7. Save conversation to Firestore
//
// Streaming format (SSE):
// data: {"type": "text", "content": "partial response..."}\n\n
// data: {"type": "tool_call", "name": "createTask", "args": {...}}\n\n
// data: {"type": "tool_result", "name": "createTask", "result": "Task created..."}\n\n
// data: {"type": "done"}\n\n
```

### File: `src/app/api/ai/rescue/route.ts`

```typescript
// POST /api/ai/rescue
// Request: { taskId: string, userId: string }
// 
// Implementation:
// 1. Fetch task from Firestore
// 2. Calculate time remaining until deadline
// 3. Determine severity (yellow/orange/red)
// 4. Fetch user profile for personality context
// 5. Call Rescue Agent with:
//    - Task details + subtasks
//    - Time remaining
//    - User personality
//    - Current time
// 6. Parse structured output (RescuePlan)
// 7. Save rescue plan to task document
// 8. Update task status to 'rescued'
// 9. Return rescue plan
//
// Response: { success: boolean, rescuePlan: RescuePlan }

// PATCH /api/ai/rescue  
// Request: { taskId: string, stepId: string, completed: boolean }
// Updates a specific rescue step's completion status

// GET /api/ai/rescue?userId={userId}
// Returns all active rescue plans for the user
```

### File: `src/app/api/ai/ghost-worker/route.ts`

```typescript
// POST /api/ai/ghost-worker
// Request: { taskId: string, deliverableType: string, additionalContext?: string, userId: string }
//
// Implementation:
// 1. Fetch task details
// 2. Fetch user profile
// 3. Call Ghost Worker Agent with task context + deliverable type
// 4. Parse structured output (GhostWorkerOutput)
// 5. Save to task.ghostWorkerOutput
// 6. Return draft
//
// Response: { success: boolean, output: GhostWorkerOutput }

// PATCH /api/ai/ghost-worker
// Request: { taskId: string, approved: boolean, edits?: string }
// Approves or edits the ghost worker output
```

### File: `src/app/api/ai/analyze/route.ts`

```typescript
// GET /api/ai/analyze?userId={userId}&range={today|week|month}
//
// 1. Fetch analytics data from Firestore for the time range
// 2. Fetch current tasks list
// 3. Call Time Warp Agent with analytics + tasks
// 4. Return forecasts + insights
//
// Response: {
//   forecasts: BottleneckForecast[],
//   insights: ProductivityInsight[],
//   weeklyReport: string
// }
```

### File: `src/app/api/ai/decompose/route.ts`

```typescript
// POST /api/ai/decompose
// Request: { title: string, description: string, deadline: string, userId: string }
//
// 1. Call Decomposer Agent
// 2. Create Goal document in Firestore
// 3. Create individual Task documents for each generated task
// 4. Link tasks to goal
// 5. Return goal + tasks
//
// Response: { goal: Goal, tasks: Task[], totalHours: number, suggestedSchedule: string }
```

### File: `src/app/api/ai/scan/route.ts`

```typescript
// POST /api/ai/scan
// Request: { image: string (base64), userId: string }
//
// 1. Create Gemini Flash instance with vision
// 2. Send image with prompt:
//    "Analyze this image and extract any tasks, deadlines, assignments, or 
//     action items. For each item found, provide: title, estimated deadline 
//     (if mentioned), priority (infer from context), and category."
// 3. Parse response into task suggestions
// 4. Return suggestions (user confirms before creating tasks)
//
// Response: { suggestions: { title, deadline?, priority, category, rawText }[] }
```

### File: `src/app/api/tasks/route.ts`

```typescript
// GET /api/tasks?userId={}&status={}&priority={}&dueBefore={}&limit={}
// Returns filtered task list from Firestore
// Sort by: priority (critical first), then deadline (earliest first)

// POST /api/tasks
// Request: Task object (without id, createdAt)
// Creates task in Firestore, awards XP, returns created task

// PATCH /api/tasks
// Request: { taskId: string, updates: Partial<Task> }
// Updates task. If status changed to 'completed':
//   - Set completedAt
//   - Award XP (based on priority: critical=50, high=30, medium=20, low=10)
//   - Update streak if applicable
//   - Increment tasksCompletedToday
//   - Check for badge unlocks

// DELETE /api/tasks
// Request: { taskId: string }
// Soft delete or hard delete from Firestore
```

### File: `src/app/api/goals/route.ts`

```typescript
// Standard CRUD for goals
// GET: List goals with status filter
// POST: Create goal
// PATCH: Update goal progress, milestones
// DELETE: Archive goal (set status to 'abandoned')
//
// Also handles habits:
// GET /api/goals/habits?userId={}
// POST /api/goals/habits - Create habit
// PATCH /api/goals/habits - Log completion
```

### File: `src/app/api/calendar/sync/route.ts`

```typescript
// GET /api/calendar/sync?userId={}
// Fetches upcoming events from Google Calendar API using user's access_token
// Returns: { events: { title, start, end, description }[] }

// POST /api/calendar/sync
// Request: { taskId: string, userId: string }
// Creates a Google Calendar event from a task
// Sets: title = task title, start/end based on estimated minutes, description = task description
```

### File: `src/app/api/notifications/route.ts`

```typescript
// POST /api/notifications/check
// Called periodically (or by cron) to check for approaching deadlines
//
// For each user:
// 1. Query tasks where deadline is within next 6 hours and status != 'completed'
// 2. For tasks within 1 hour: Send URGENT push notification via FCM
// 3. For tasks within 3 hours: Send WARNING notification
// 4. For tasks within 6 hours: Send REMINDER notification
// 5. If rescue mode is enabled and task is within 2 hours: Auto-activate rescue mode
// 6. Store notification in user's inApp notifications collection

// GET /api/notifications?userId={}
// Returns unread notifications for the user

// PATCH /api/notifications
// Request: { notificationId: string, read: true }
// Marks notification as read
```

### File: `src/app/api/analytics/route.ts`

```typescript
// GET /api/analytics?userId={}&startDate={}&endDate={}
// Returns DailyAnalytics[] for the date range

// POST /api/analytics/log
// Request: { userId: string, event: 'task_completed'|'focus_start'|'focus_end'|'rescue_activated' }
// Updates today's analytics document in Firestore

// GET /api/analytics/export?userId={}&format=json
// Returns analytics data as downloadable JSON
// (PDF export handled client-side using jsPDF or html2canvas)
```

---

## 8. UI Component Specifications

### File: `src/components/ui/GlassCard.tsx`

```typescript
// Props:
// - children: React.ReactNode
// - className?: string
// - glowColor?: 'cyan' | 'purple' | 'pink' | 'green' | 'amber' | 'none' (default: 'none')
// - hoverable?: boolean (default: true)
// - padding?: 'sm' | 'md' | 'lg' (default: 'md')
//   sm = 12px, md = 20px, lg = 32px
// - onClick?: () => void
// - animate?: boolean (default: false) — if true, wrap in framer-motion with slide-up
//
// Renders: <div> with glass-card class
// If glowColor is not 'none', applies the corresponding neon-border-{color} on hover
// Uses framer-motion for hover scale (1.01) and animate on mount if animate=true
```

### File: `src/components/ui/NeonButton.tsx`

```typescript
// Props:
// - children: React.ReactNode
// - variant: 'cyan' | 'purple' | 'pink' | 'green' | 'solid' (default: 'cyan')
// - size: 'sm' | 'md' | 'lg' (default: 'md')
//   sm = padding 6px 12px, text-xs
//   md = padding 10px 20px, text-sm
//   lg = padding 14px 28px, text-md
// - onClick?: () => void
// - disabled?: boolean
// - loading?: boolean — shows spinner icon
// - fullWidth?: boolean
// - icon?: React.ReactNode (prepended to children)
// - type?: 'button' | 'submit'
//
// CSS: Uses .glow-button and variant classes from globals.css
```

### File: `src/components/ui/ProgressRing.tsx`

```typescript
// Props:
// - progress: number (0-100)
// - size: number (default: 120) — SVG viewbox size
// - strokeWidth: number (default: 8)
// - color: 'cyan' | 'purple' | 'pink' | 'green' (default: 'cyan')
// - label?: string | React.ReactNode — shown in center
// - showPercentage?: boolean (default: true) — shows percentage in center
// - animate?: boolean (default: true) — animate on mount
//
// Implementation:
// - SVG with two circles: background (gray) and foreground (colored)
// - strokeDasharray = 2 * PI * radius
// - strokeDashoffset = dasharray * (1 - progress/100)
// - Gradient stroke using linearGradient
// - If animate: use framer-motion to animate strokeDashoffset from dasharray to final value
// - Center text with percentage or custom label
```

### File: `src/components/ui/CommandPalette.tsx`

```typescript
// Props:
// - isOpen: boolean
// - onClose: () => void
// - tasks: Task[]
// - onAction: (action: CommandAction) => void
//
// CommandAction = { type: 'navigate'|'createTask'|'rescue'|'chat', payload: any }
//
// Features:
// - Full-screen overlay with backdrop blur
// - Centered search input with neon cyan border
// - Results list with keyboard navigation (arrow keys + enter)
// - Categories: "AI Commands", "Tasks", "Navigation", "Quick Actions"
// - AI Commands: "Plan my day", "What should I do next?", "Break down a goal",
//   "Start Rescue Mode", "Generate draft", "Show analytics"
// - Navigation: "Dashboard", "Tasks", "Goals", "Analytics", "Settings"
// - Tasks: Search/filter existing tasks by title
// - Keyboard shortcut listener: Cmd+K or Ctrl+K to open
// - ESC to close
```

### File: `src/components/ui/Toast.tsx`

```typescript
// Toast notification system
//
// ToastProvider: Context provider that manages toast queue
// useToast: Hook that returns { showToast: (options) => void }
//
// Toast options:
// - message: string
// - type: 'info' | 'success' | 'warning' | 'error' (default: 'info')
// - duration: number (ms, default: 4000)
// - action?: { label: string, onClick: () => void }
//
// Toast component:
// - Positioned top-right, stacked
// - Slide-in animation (from right)
// - Auto-dismiss timer with progress bar
// - Close button
// - Type-based colors: info=cyan, success=green, warning=amber, error=pink
```

### File: `src/components/chat/AIChatSidebar.tsx`

```typescript
// Props:
// - isOpen: boolean
// - onToggle: () => void
// - userId: string
//
// State:
// - messages: ChatMessage[]
// - inputValue: string
// - isLoading: boolean
// - isStreaming: boolean
// - conversationId: string | null
//
// Features:
// - Collapsible sidebar (right side, 380px width on desktop)
// - Header: "Chronos AI" with neon cyan glow, minimize button
// - Message list: Scrollable, auto-scroll on new messages
//   - User messages: Right-aligned, purple background
//   - AI messages: Left-aligned, glass-card background
//   - Tool call indicators: Show "Creating task..." with spinner
//   - Markdown rendering in AI messages (use dangerouslySetInnerHTML with sanitized markdown)
// - Input area:
//   - Text input with placeholder "Ask Chronos anything..."
//   - Send button (arrow icon)
//   - Voice input button (microphone icon) — toggles VoiceInput
//   - Camera button (camera icon) — opens CameraScanner
// - Quick action chips above input:
//   - "Plan my day" / "What's next?" / "Break down a goal" / "Show insights"
// - Typing indicator: Three dots with pulse animation when AI is responding
//
// API Integration:
// - On send: POST to /api/ai/chat with message, conversationId, userId
// - Parse SSE stream for real-time responses
// - On tool_call events: Show tool execution indicator
// - On done: Stop streaming state
```

### File: `src/components/chat/VoiceInput.tsx`

```typescript
// Props:
// - isActive: boolean
// - onActivate: () => void
// - onDeactivate: () => void
// - onTranscript: (text: string) => void
//
// Implementation:
// - Uses Web Speech API (SpeechRecognition) for speech-to-text
// - Alternatively, could use Gemini Live API via WebSocket for more advanced voice
// - For hackathon scope: Use Web Speech API (simpler, works offline)
//
// UI:
// - When inactive: Microphone icon button
// - When active: 
//   - Pulsating neon cyan circle around mic icon
//   - Waveform visualization (4-6 animated bars)
//   - "Listening..." text
//   - Stop button
// - On transcript: Call onTranscript callback with recognized text
```

### File: `src/components/chat/CameraScanner.tsx`

```typescript
// Props:
// - isOpen: boolean
// - onClose: () => void
// - onScan: (suggestions: TaskSuggestion[]) => void
//
// Implementation:
// - Opens camera using navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
// - Shows live camera feed in a modal
// - "Capture" button takes a snapshot (canvas.toDataURL)
// - Sends base64 image to POST /api/ai/scan
// - Shows extracted suggestions with confirm/dismiss per item
//
// UI:
// - Full-screen modal with camera feed
// - Neon cyan capture button at bottom
// - After capture: Shows image preview + extracted items
// - Each item: checkbox + title + auto-detected deadline
// - "Add Selected Tasks" button
```

### File: `src/components/tasks/TaskCard.tsx`

```typescript
// Props:
// - task: Task
// - onComplete: (taskId: string) => void
// - onEdit: (task: Task) => void
// - onDelete: (taskId: string) => void
// - onRescue: (taskId: string) => void
// - compact?: boolean (for list view)
//
// UI:
// - Glass card with left border colored by priority
// - Top row: Title (truncated) + priority badge
// - Middle: Description (2 lines max, truncated)
// - Deadline display: 
//   - If > 24h: Show date (e.g., "Jun 28")
//   - If < 24h: Show countdown (e.g., "5h 30m left") in amber
//   - If < 2h: Show countdown in red with pulse animation
//   - If overdue: Show "OVERDUE" badge in red
// - Subtask progress: "{completed}/{total} subtasks" with mini progress bar
// - Bottom row: Category tag + action buttons (complete ✓, edit ✏, delete 🗑, rescue 🚨)
// - If task has rescuePlan: Show "🚨 Rescue Active" badge with pulse
// - If task has ghostWorkerOutput: Show "👻 Draft Ready" badge
// - If task.aiGenerated: Show small "AI" badge
//
// Animation: framer-motion hover scale + complete animation (checkmark + fade)
```

### File: `src/components/tasks/TaskKanban.tsx`

```typescript
// Props:
// - tasks: Task[]
// - onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
// - onTaskClick: (task: Task) => void
//
// Implementation:
// - Three columns: Todo, In Progress, Completed
// - HTML5 Drag and Drop API for moving cards between columns
// - Column headers with count badges
// - "Add task" button at bottom of Todo column
// - Empty state illustration for empty columns
//
// Drag behavior:
// - onDragStart: Set dataTransfer with taskId
// - onDragOver: Highlight drop zone
// - onDrop: Call onTaskUpdate with new status
```

### File: `src/components/rescue/RescueModeView.tsx`

```typescript
// Props:
// - task: Task
// - rescuePlan: RescuePlan
// - onStepComplete: (stepId: string) => void
// - onExit: () => void
//
// UI:
// - Full-screen overlay (distraction-free)
// - Top: Large countdown timer to deadline with neon glow
//   - Color changes: green (>2h) → amber (1-2h) → red (<1h) → pulsing red (<15min)
// - Severity indicator: Yellow/Orange/Red banner
// - If !feasible: Warning message "This will be tight. Here's the best possible plan."
// - Step list:
//   - Current step: Highlighted with neon cyan border + active timer
//   - Completed steps: Green checkmark + strike-through
//   - Upcoming steps: Dimmed
//   - Each step: Time block, action description, tips (expandable), skip button
// - Progress bar: Shows overall completion percentage
// - Motivational message panel (from accountability agent, changes periodically)
// - Checkpoint milestones (shown inline in step list)
// - Bottom: "I'm done with this step" button + "Exit Rescue Mode" text link
// - Sacrifices panel: Collapsible list of what was skipped
```

### File: `src/components/analytics/ProductivityChart.tsx`

```typescript
// Props:
// - data: DailyAnalytics[]
// - type: 'line' | 'bar' | 'donut' | 'heatmap'
// - title: string
// - height?: number (default: 300)
//
// Implementation (using Recharts):
// - line: Productivity score over time, gradient fill under line
//   - Custom tooltip with glass-card styling
//   - X-axis: dates, Y-axis: score (0-100)
//   - Reference line at average score
// - bar: Focus minutes per day, colored by threshold
//   - <60 min = red, 60-120 = amber, 120+ = green
// - donut: Task completion rate
//   - Segments: completed, in_progress, overdue
//   - Center: overall percentage
// - heatmap: Streak calendar (custom SVG, 52 weeks x 7 days)
//   - Intensity based on productivity score
//   - Color scale: bg-tertiary (0) → neon-cyan (100)
//   - Tooltip with date + score on hover
//
// All charts use dark theme colors from CSS variables
// Recharts customizations: dark background, neon grid lines, glass tooltips
```

### File: `src/components/gamification/XPBar.tsx`

```typescript
// Props:
// - gamification: UserGamification
// - compact?: boolean
//
// UI:
// - Level badge: Circular badge with level number, neon purple glow
// - XP progress bar: Shows current XP / next level XP
//   - Bar fill: gradient from cyan to purple
//   - Animated width on change
// - Streak display: 🔥 icon + streak count + "days" label
//   - If streak > 0: fire icon with animation
//   - If streak ≥ 7: additional "🔥🔥" for emphasis
// - Tasks completed today: "✅ {count} today"
// - Recent badges: Last 3 unlocked badges with small icons
//
// Level thresholds:
// Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, Level 4: 500 XP,
// Level 5: 1000 XP, Level 6: 2000 XP, Level 7: 3500 XP, Level 8: 5000 XP,
// Level 9: 7500 XP, Level 10: 10000 XP
```

### File: `src/components/onboarding/PersonalityQuiz.tsx`

```typescript
// Props:
// - onComplete: (profile: Partial<UserProfile>) => void
//
// State:
// - currentStep: number (0-5)
// - answers: Record<string, string>
//
// Steps:
// 0. Welcome screen with Chronos logo animation
//    "Welcome to Chronos. Let me get to know you."
//    [Continue] button
//
// 1. Mode selection (full-width cards with icons):
//    "Who are you?"
//    - 🎓 Student: "I'm managing coursework, exams, and projects"
//    - 💼 Professional: "I'm managing work projects, meetings, and deliverables"
//    - 🚀 Entrepreneur: "I'm building something and juggling everything"
//
// 2. Work style (cards):
//    "How do you work best?"
//    - ⚡ Sprinter: "Intense bursts of focus, then rest"
//    - 🏃 Marathoner: "Steady, consistent progress throughout the day"
//    - 🔄 Mixed: "Depends on the task and my mood"
//
// 3. Motivation type (cards):
//    "What gets you going?"
//    - 🌟 Encouragement: "Positive vibes and celebration of wins"
//    - 🔥 Pressure: "Urgency and a kick in the right direction"
//    - 📊 Data: "Numbers, stats, and objective analysis"
//
// 4. Communication style (cards):
//    "How should I talk to you?"
//    - 😊 Casual: "Like a friend — relaxed and fun"
//    - 📋 Professional: "Keep it structured and business-like"
//    - ⚡ Minimal: "Just the essentials, no fluff"
//
// 5. Features toggle:
//    "Which features do you want?"
//    Toggleable cards for: Ghost Worker, Gamification, Rescue Mode, Voice
//    All default ON, user can toggle off
//
// Animation: Each step slides in from right, slides out to left on advance
// Progress dots at bottom showing current step
```

### File: `src/components/demo/DemoTour.tsx`

```typescript
// Props:
// - onComplete: () => void
// - onSkip: () => void
//
// Implementation:
// - Spotlight overlay: Dark backdrop with a "cutout" highlighting the target element
// - Tooltip: Glass card positioned near the spotlighted element
// - Steps array:
//   1. Dashboard overview: "This is your command center. See all your tasks at a glance."
//   2. AI Chat: "Meet Chronos, your AI Time Guardian. Ask anything!"
//   3. Rescue Mode alert: "When a deadline approaches, Chronos activates Rescue Mode."
//   4. Task board: "Drag tasks between columns. Chronos auto-prioritizes."
//   5. Analytics: "Track your productivity with AI-powered insights."
//   6. Cmd+K: "Press Cmd+K for quick actions anytime."
//
// Each step:
// - target: CSS selector of element to highlight
// - title: Step title
// - description: Explanation text
// - position: 'top' | 'bottom' | 'left' | 'right'
//
// Navigation: "Next" button, "Skip tour" link, progress dots
// Auto-advance: 8 seconds per step if user doesn't click
```

---

## 9. Page Specifications

### File: `src/app/layout.tsx`

```typescript
// Root layout
// - Import Google Fonts via next/font/google: Inter (400-900), JetBrains Mono (400-700), Orbitron (400-900)
// - Import globals.css
// - Wrap children in:
//   1. SessionProvider (NextAuth)
//   2. AuthContextProvider
//   3. DemoContextProvider
//   4. ToastProvider
// - <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${orbitron.variable}`}>
// - <head>: Metadata with title "Chronos — AI Time Guardian", description, og:image, theme-color
// - <body>: {children}
```

### File: `src/app/page.tsx` — Landing Page

```typescript
// Public landing page (not authenticated)
//
// Sections:
// 1. HERO (full viewport height):
//    - Animated background: Floating time/clock particles (CSS animations)
//    - Large "CHRONOS" text in Orbitron font with neon cyan glow
//    - Tagline: "Your AI Time Guardian" in Inter
//    - Subtitle: "Don't just manage time. Rescue it."
//    - Two CTAs: "Start Free" (solid glow button) + "Try Demo" (outline button)
//    - Scroll indicator at bottom (animated chevron)
//
// 2. PROBLEM STATEMENT (dark section):
//    - Stats: "87% of people miss deadlines regularly"
//    - "Traditional to-do apps don't help you actually DO the work"
//    - Animated counter stats
//
// 3. FEATURES SHOWCASE (3-column grid):
//    - Each feature in a GlassCard with icon + title + description + mini animation
//    - Features: Rescue Mode, Ghost Worker, Time Warp, Smart Decomposition,
//      Voice Assistant, Calendar Sync
//    - Cards animate in on scroll (IntersectionObserver or framer-motion whileInView)
//
// 4. HOW IT WORKS (3 steps):
//    Step 1: "Tell Chronos about yourself" (onboarding)
//    Step 2: "Add your tasks and goals" (task management)
//    Step 3: "Chronos takes over" (AI agent magic)
//    Connected by animated neon line
//
// 5. MODES (3 cards):
//    Student | Professional | Entrepreneur
//    Each with specific examples of how Chronos helps
//
// 6. FOOTER:
//    "Built with ❤️ and Google AI" + tech stack logos
//    "Powered by Gemini 2.5"
```

### File: `src/app/(auth)/login/page.tsx`

```typescript
// Login page
// - Centered card on dark background
// - Chronos logo at top
// - "Sign in to Chronos" heading
// - Google Sign-In button (uses signInWithGoogle from firebase.ts or NextAuth)
//   - Google logo + "Continue with Google"
//   - Neon cyan glow on hover
// - Divider: "or"
// - "Try Demo Mode" button (purple outline)
//   - Sets demo mode in context, redirects to /dashboard
// - Footer: "By signing in, you agree to our Terms" (placeholder link)
//
// On successful auth:
// - Check if onboardingCompleted
// - If not: redirect to /onboarding
// - If yes: redirect to /dashboard
```

### File: `src/app/(app)/layout.tsx` — App Shell

```typescript
// Authenticated layout (requires session)
// If not authenticated and not demo: redirect to /login
//
// Layout structure:
// ┌──────────────────────────────────────────────────────────┐
// │ TOP BAR (height: 56px, glass background)                │
// │ [☰ Menu] [CHRONOS logo] [Search Cmd+K] [🔔 Notifs] [👤]│
// ├────────────┬─────────────────────────────┬───────────────┤
// │            │                             │               │
// │ SIDEBAR    │ MAIN CONTENT                │ AI CHAT       │
// │ (240px)    │ (flex: 1)                   │ (380px)       │
// │            │ {children}                  │ (collapsible) │
// │ Navigation │                             │               │
// │ items:     │                             │               │
// │ 📊 Dash    │                             │               │
// │ ✅ Tasks   │                             │               │
// │ 🎯 Goals   │                             │               │
// │ 📈 Analyt  │                             │               │
// │ ⚙️ Sett    │                             │               │
// │            │                             │               │
// │ Gamif bar  │                             │               │
// │ (bottom)   │                             │               │
// ├────────────┴─────────────────────────────┴───────────────┤
// │ COMMAND PALETTE (overlay, toggled by Cmd+K)              │
// └──────────────────────────────────────────────────────────┘
//
// Sidebar navigation items:
// - Dashboard (LayoutDashboard icon from lucide-react)
// - Tasks (CheckSquare icon)
// - Goals & Habits (Target icon)
// - Analytics (BarChart3 icon)
// - Settings (Settings icon)
//
// Active item: neon cyan left border + cyan text
// Hover: bg-hover background
//
// Sidebar collapses to icon-only on screens < 1024px
// On mobile (<768px): Sidebar becomes a slide-out drawer
//
// Demo mode: Show "DEMO MODE" badge in top bar with "Exit Demo" button
//
// Notification bell: Shows unread count badge, opens dropdown with recent notifications
```

### File: `src/app/(app)/dashboard/page.tsx`

```typescript
// Main dashboard - the heart of Chronos
//
// COMPONENT LAYOUT:
//
// Row 1 (full width): STATUS BAR
// - Active rescue modes count (if any) with pulsing indicator
// - Next deadline: "Assignment due in 2h 30m" with urgency color
// - Today's focus time: "3h 45m focused today"
// - Current streak: "🔥 12 day streak"
//
// Row 2 (2-column grid: content + chat):
//
// LEFT COLUMN:
//
// Section A: TODAY'S PRIORITIES
// - Header: "Today's Focus" + "Add Task" button
// - List of tasks due today, sorted by AI priority
// - Each task rendered as compact TaskCard
// - Empty state: "No tasks for today! 🎉 Want to plan something?"
//
// Section B: PRODUCTIVITY RING
// - ProgressRing showing daily completion percentage
// - Labels: "X of Y tasks completed"
// - XP earned today
//
// Section C: RESCUE ALERTS (conditional)
// - Only shows if tasks are within 6 hours of deadline
// - Each alert: Glass card with pink/red glow + "Activate Rescue Mode" button
// - Auto-appears when new deadlines approach (real-time Firestore listener)
//
// Section D: BOTTLENECK FORECAST
// - Mini bar chart showing next 7 days
// - Bars colored by risk level (green/amber/red)
// - "View Details" link to /analytics
//
// Section E: GAMIFICATION (conditional, if enabled)
// - XPBar component
// - Recent achievements
//
// RIGHT COLUMN:
// - AIChatSidebar component (always visible on desktop)
//
// Data fetching:
// - Use useTasks() hook for real-time task data
// - Fetch analytics on mount
// - Set up Firestore real-time listeners for task changes
```

### File: `src/app/(app)/tasks/page.tsx`

```typescript
// Task management page
//
// Top bar:
// - Tab switcher: "Board" | "List" | "Calendar"
// - Filter dropdowns: Priority, Category, Status
// - "New Task" button
// - Search input
//
// Board view (default): TaskKanban component
// List view: Table-style with sortable columns
// Calendar view: Month grid with task dots on deadline dates
//
// "New Task" modal:
// - Title input
// - Description textarea
// - Priority selector (4 color-coded buttons)
// - Deadline date/time picker
// - Category input (with autocomplete from existing categories)
// - Tags input (chips)
// - "AI Estimate" button: Sends task details to Gemini for time estimate
// - "Add Subtasks" section: Dynamic list
// - "Create" button
```

### File: `src/app/(app)/goals/page.tsx`

```typescript
// Goals & Habits page
//
// Two tabs: "Goals" | "Habits"
//
// GOALS TAB:
// - "Create Goal" button → opens modal with:
//   - Title, Description, Deadline
//   - "🤖 Smart Decompose" button: Calls decomposer agent, auto-creates milestones + tasks
// - Goal cards:
//   - Title + progress percentage
//   - Progress bar (gradient fill)
//   - Milestone timeline (vertical dots connected by line)
//   - Each milestone: checkbox + title + due date
//   - Linked tasks count
//   - "View Tasks" link
//
// HABITS TAB:
// - "New Habit" button
// - Habit cards:
//   - Title + frequency
//   - Streak count with fire icon
//   - Calendar heatmap (last 12 weeks, mini version)
//   - "Complete Today" button (turns green when done)
// - Overall habit completion rate
```

### File: `src/app/(app)/analytics/page.tsx`

```typescript
// Analytics dashboard
//
// Time range selector: "Today" | "This Week" | "This Month" | "All Time"
//
// Row 1: Stat cards (4 across)
// - Total tasks completed (with trend arrow)
// - Average productivity score (with trend)
// - Current streak
// - Focus hours this period
//
// Row 2 (2-column):
// - Left: Productivity score line chart (30 days)
// - Right: Task completion donut chart
//
// Row 3 (2-column):
// - Left: Focus time bar chart (daily)
// - Right: Category breakdown pie chart
//
// Row 4 (full width):
// - Streak calendar heatmap (GitHub-style, 52 weeks)
//
// Row 5: AI INSIGHTS PANEL
// - "🤖 Chronos Insights" header
// - AI-generated insights from Time Warp agent
// - Each insight: icon + title + description + metric
// - Types: achievement (green), warning (amber), recommendation (cyan), pattern (purple)
//
// Bottom: "Export Report" button → generates PDF or downloads JSON
```

### File: `src/app/(app)/rescue/[taskId]/page.tsx`

```typescript
// Dynamic route: /rescue/{taskId}
// Full-screen Rescue Mode experience
//
// On mount:
// 1. Fetch task from Firestore
// 2. If no rescue plan: Call POST /api/ai/rescue to generate one
// 3. Display RescueModeView component
//
// Props: task, rescuePlan from API
// 
// Exit: Navigate back to /dashboard
// On step complete: PATCH /api/ai/rescue
```

### File: `src/app/(app)/settings/page.tsx`

```typescript
// Settings page
//
// Sections:
// 1. Profile: Display name, email, photo (from Google), user mode selector
// 2. Personality: Re-take personality quiz, or manually adjust each setting
//    - Work style, motivation type, communication style
// 3. Features: Toggle switches for each feature
//    - Ghost Worker, Gamification, Rescue Mode, Voice, Camera Scan
// 4. Integrations: 
//    - Google Calendar: Connected/Disconnect button, sync toggle
//    - Gmail: Connected/Disconnect, email notification toggle
// 5. Notifications:
//    - Push notification permission request button
//    - Email notifications toggle
//    - In-app notifications toggle
//    - Notification timing: How far before deadline (1h, 2h, 6h, 24h)
// 6. Data:
//    - Export all data as JSON
//    - Delete account (with confirmation)
```

---

## 10. Hooks Specifications

### File: `src/hooks/useAuth.ts`
```typescript
// Returns: { user, loading, isDemo, signIn, signOut, startDemo, googleAccessToken }
// Uses NextAuth useSession + AuthContext
```

### File: `src/hooks/useTasks.ts`
```typescript
// Args: userId: string, filters?: { status?, priority?, dueBefore? }
// Returns: { tasks, loading, error, createTask, updateTask, deleteTask, completeTask }
// Implementation: Real-time Firestore onSnapshot listener on users/{userId}/tasks
// Applies client-side filtering + sorting
// CRUD operations call API routes + optimistic updates
```

### File: `src/hooks/useAIChat.ts`
```typescript
// Args: userId: string
// Returns: { messages, sendMessage, isStreaming, clearChat, conversationId }
// Implementation:
// - sendMessage: POST to /api/ai/chat, parse SSE stream
// - Append partial text to current AI message as it streams
// - Handle tool_call events (show in UI)
// - Append tool_result events
// - On done: finalize message
```

### File: `src/hooks/useCommandPalette.ts`
```typescript
// Returns: { isOpen, open, close, toggle }
// Sets up global keyboard listener for Cmd+K / Ctrl+K
```

### File: `src/hooks/useNotifications.ts`
```typescript
// Args: userId: string
// Returns: { notifications, unreadCount, requestPermission, markAsRead }
// Implementation:
// - Request browser notification permission
// - Register FCM service worker
// - Get FCM token, save to user profile
// - Listen for in-app notifications from Firestore
```

---

## 11. Demo Mode System

### File: `src/lib/demo/demo-data.ts`

This file contains ALL pre-populated demo data for **3 user modes**. The demo supports **mode switching** so judges can see tailored AI behavior for each persona.

```typescript
// ===== 3 DEMO USER PROFILES (one per mode) =====

export const demoUsers: Record<UserMode, UserProfile> = {
  student: {
    id: 'demo-student-001',
    displayName: 'Arjun Mehta',
    email: 'arjun@demo.chronos.dev',
    photoURL: '',
    mode: 'student',
    personality: {
      workStyle: 'sprinter',
      motivationType: 'pressure',
      communicationStyle: 'casual',
      timezone: 'Asia/Kolkata',
      peakHours: [9, 10, 11, 14, 15, 16, 21, 22],
    },
    preferences: {
      gamificationEnabled: true,
      ghostWorkerEnabled: true,
      rescueModeEnabled: true,
      voiceEnabled: true,
      notificationChannels: ['push', 'inApp'],
    },
    onboardingCompleted: true,
    createdAt: new Date('2026-06-10'),
  },
  professional: {
    id: 'demo-professional-001',
    displayName: 'Priya Sharma',
    email: 'priya@demo.chronos.dev',
    photoURL: '',
    mode: 'professional',
    personality: {
      workStyle: 'marathoner',
      motivationType: 'data-driven',
      communicationStyle: 'professional',
      timezone: 'Asia/Kolkata',
      peakHours: [9, 10, 11, 14, 15, 16],
    },
    preferences: {
      gamificationEnabled: false,
      ghostWorkerEnabled: true,
      rescueModeEnabled: true,
      voiceEnabled: true,
      notificationChannels: ['push', 'email', 'inApp'],
    },
    onboardingCompleted: true,
    createdAt: new Date('2026-06-08'),
  },
  entrepreneur: {
    id: 'demo-entrepreneur-001',
    displayName: 'Karan Patel',
    email: 'karan@demo.chronos.dev',
    photoURL: '',
    mode: 'entrepreneur',
    personality: {
      workStyle: 'mixed',
      motivationType: 'encouragement',
      communicationStyle: 'casual',
      timezone: 'Asia/Kolkata',
      peakHours: [8, 9, 10, 11, 15, 16, 20, 21, 22, 23],
    },
    preferences: {
      gamificationEnabled: true,
      ghostWorkerEnabled: true,
      rescueModeEnabled: true,
      voiceEnabled: true,
      notificationChannels: ['push', 'email', 'inApp'],
    },
    onboardingCompleted: true,
    createdAt: new Date('2026-06-05'),
  },
};

// ===== DEMO TASKS PER MODE =====
// Each mode has 15+ tasks across all statuses.
// Deadlines are relative to Date.now() so they always look fresh.

// --- STUDENT TASKS ---
// Urgent (due < 3h):
//   "Machine Learning Assignment" — critical, 40% subtasks done, 1.5h left
//   "Submit Lab Report" — high, 3h left
// Today:
//   "Review DSA Notes for Interview" — high
//   "Email Professor about Extension" — medium
//   "Complete React Project Component" — high
// This week:
//   "Prepare Presentation Slides" — medium
//   "Study for Database Exam" — critical
//   "Update LinkedIn Profile" — low
//   "Attend Mock Interview Session" — high
// Completed:
//   "Submit Resume to 5 Companies" — done yesterday
//   "Complete Python Assignment" — done 2 days ago
//   "Read Chapter 7 of CLRS" — done today
// Overdue:
//   "Blog Post Draft" — 1 day overdue
//   "Gym Registration Form" — 2 days overdue
// Rescued (has rescue plan):
//   "Machine Learning Assignment" — includes pre-generated RescuePlan

// --- PROFESSIONAL TASKS ---
// Urgent (due < 3h):
//   "Finalize Sprint Review Deck" — critical, due in 2h
//   "Submit Quarterly Report to VP" — high, due in 4h
// Today:
//   "Review Pull Requests (3 pending)" — high
//   "Prepare 1:1 Agenda with Manager" — medium
//   "Client Demo Prep — Feature Walkthrough" — critical
// This week:
//   "Performance Review Self-Assessment" — high
//   "Architecture Design Doc — Microservices" — medium
//   "Team Standup Retrospective Notes" — low
//   "Interview Candidate — Backend Role" — high
// Completed:
//   "Deploy v2.3 to Staging" — done yesterday
//   "Fix Production Bug #4821" — done today
//   "Complete AWS Certification Module 5" — done 3 days ago
// Overdue:
//   "Update API Documentation" — 1 day overdue
//   "Expense Report Submission" — 2 days overdue

// --- ENTREPRENEUR TASKS ---
// Urgent (due < 3h):
//   "Investor Pitch Deck — Final Review" — critical, due in 1h
//   "Send Hiring Post on LinkedIn" — high, due in 3h
// Today:
//   "Review MVP Analytics Dashboard" — high
//   "Reply to 5 Customer Support Emails" — medium
//   "Schedule Social Media Content for Week" — medium
// This week:
//   "Finalize Term Sheet with Angel Investor" — critical
//   "Landing Page A/B Test Analysis" — medium
//   "Onboard New Developer — Setup Guide" — high
//   "Product Roadmap Q3 Planning" — high
// Completed:
//   "Launch Beta to 100 Users" — done 2 days ago
//   "Register Trademark Application" — done yesterday
//   "Set Up Payment Gateway (Razorpay)" — done today
// Overdue:
//   "Blog: Our Journey from Idea to MVP" — 3 days overdue
//   "Tax Filing Documents to CA" — 1 day overdue

// ===== DEMO GOALS PER MODE =====

// Student:
// 1. "Complete Final Year Project" — 65% progress
//    Milestones: Literature Review (done), Implementation (in progress),
//    Testing (upcoming), Documentation (upcoming), Presentation (upcoming)
// 2. "Crack Campus Placements" — 30% progress
//    Milestones: Resume Ready (done), 100 DSA Problems (30/100),
//    System Design Prep (upcoming), Mock Interviews x5 (1/5)

// Professional:
// 1. "Get Promoted to Senior Engineer" — 55% progress
//    Milestones: Lead 2 Projects (1/2 done), Mentoring (in progress),
//    Tech Talk at Team Meeting (upcoming), Cross-team Collaboration (done)
// 2. "AWS Solutions Architect Certification" — 40% progress
//    Milestones: Complete Course (60%), Practice Exams (0/3), Schedule Exam (upcoming)

// Entrepreneur:
// 1. "Launch Product V1.0" — 72% progress
//    Milestones: MVP Built (done), Beta Testing (done), Payment Integration (done),
//    Marketing Site (in progress), Launch Campaign (upcoming)
// 2. "Close Seed Round — ₹2 Cr" — 35% progress
//    Milestones: Pitch Deck (done), 10 Investor Meetings (4/10),
//    Due Diligence Docs (upcoming), Term Sheet (upcoming)

// ===== DEMO HABITS PER MODE =====

// Student:
// 1. "Solve 2 LeetCode Problems" — daily, 8-day streak
// 2. "Read 30 minutes" — daily, 4-day streak
// 3. "Exercise" — daily, 2-day streak

// Professional:
// 1. "Review Tech News (15 min)" — daily, 12-day streak
// 2. "Write in Journal" — daily, 5-day streak
// 3. "No-Meeting Focus Block (2h)" — daily, 3-day streak

// Entrepreneur:
// 1. "Tweet about product" — daily, 15-day streak
// 2. "30-min reading (business/tech)" — daily, 7-day streak
// 3. "Customer conversation (1/day)" — daily, 4-day streak

// ===== DEMO ANALYTICS =====
// Generate 30 days of DailyAnalytics data programmatically:
// - Use a seed-based pattern for consistency
// - Weekday scores: 60-95 (higher)
// - Weekend scores: 30-70 (lower)
// - Focus minutes: 60-300/day
// - Include 2 rescue mode activations in past week
// - Pattern: gradual improvement trend over 30 days

// ===== DEMO GAMIFICATION =====
// Student: Level 5, 850 XP, 12-day streak
//   Badges: "First Task", "Week Warrior", "Speed Demon", "10-Task Streak"
// Professional: Level 7, 3200 XP, 18-day streak
//   Badges: "First Task", "Week Warrior", "Month Master", "Consistency King", "Rescue Survivor"
// Entrepreneur: Level 6, 1800 XP, 15-day streak
//   Badges: "First Task", "Hustle Mode", "Ghost Worker Fan", "Streak Legend"

// ===== DEMO CONVERSATIONS (per mode) =====

// Student conversation:
// User: "I'm stressed about my ML assignment"
// Chronos: "Yo Arjun, I see your ML assignment is due in 1.5 hours and
//           you're only 40% done. That's tight but doable if we move NOW.
//           Want me to activate Rescue Mode? I'll build a compressed
//           action plan to get you through this. ⏰🔥"
// User: "Yes please!"
// Chronos: "🚨 RESCUE MODE ACTIVATED!
//           Here's your compressed plan:
//           • 4:15-4:35 PM — Complete Section 3 (Neural Network diagrams)
//           • 4:35-4:55 PM — Write Results analysis (use template)
//           • 4:55-5:00 PM — Quick break, stretch
//           • 5:00-5:20 PM — Write Conclusion + References
//           • 5:20-5:30 PM — Proofread + Submit
//           🎯 Skip: Formatting bibliography (use auto-cite). You got this! 💪"

// Professional conversation:
// User: "What's my status for today?"
// Chronos: "Good morning, Priya. Here's your day at a glance:
//           📊 Priority Score: 78/100
//           ⚠️ 2 items need immediate attention:
//           1. Sprint Review Deck — due in 2h (I recommend Rescue Mode)
//           2. Client Demo Prep — due by EOD
//           📈 You completed 4 tasks yesterday, 12% above your weekly average.
//           Recommended next action: Start with the Sprint Review Deck."

// Entrepreneur conversation:
// User: "I need to prepare for my investor meeting"
// Chronos: "Let's crush this, Karan! 🚀
//           Your Investor Pitch Deck is due in 1 hour. Let me help:
//           👻 Ghost Worker can draft your key talking points
//           📋 I'll break down the prep into quick steps
//           Want me to activate Ghost Worker to draft your opening pitch
//           and key metrics slide notes? That'll save you 20 minutes!"
```

### File: `src/lib/demo/demo-context.tsx`

```typescript
// React Context for demo mode with MODE SWITCHING
//
// DemoProvider wraps the entire app
// Provides: {
//   isDemo: boolean,
//   currentMode: UserMode,
//   demoState: DemoState,
//   startDemo: (mode?: UserMode) => void,  // Defaults to 'student'
//   switchDemoMode: (mode: UserMode) => void,  // Switch between personas
//   exitDemo: () => void
// }
//
// When isDemo is true:
// - All API calls are intercepted and return demo data for currentMode
// - Firestore reads return demo data
// - AI chat returns scripted responses (with a 500ms-2s delay for realism)
// - Task CRUD operates on local state (allows judges to interact)
// - XP/gamification updates work on local state
// - A floating "Mode Switcher" pill appears at the bottom of the screen:
//   [🎓 Student] [💼 Professional] [🚀 Entrepreneur]
//   Clicking switches all demo data instantly with a smooth transition
//
// switchDemoMode behavior:
// - Swaps demoUser, demoTasks, demoGoals, demoHabits, demoAnalytics, demoGamification
// - Resets chat to the mode-specific scripted conversation
// - Triggers a brief loading animation (200ms shimmer) during switch
// - Preserves any tasks the judge manually created/modified
//
// Scripted AI responses for common queries (mode-aware):
// - "plan my day" → Returns a formatted day plan based on current mode's demo tasks
// - "what should i do next?" → Recommends the highest priority task
// - "break down [goal]" → Returns pre-generated decomposition
// - Any other message → Returns a contextual response adapted to:
//   - Student: casual, emoji-heavy, study-focused
//   - Professional: structured, metric-driven, corporate context
//   - Entrepreneur: energetic, startup-focused, hustle tone
```

---

## 12. PWA & Notifications

### File: `public/manifest.json`
```json
{
  "name": "Chronos — AI Time Guardian",
  "short_name": "Chronos",
  "description": "Your AI-powered productivity companion that rescues you from missed deadlines",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#07070d",
  "theme_color": "#00e5ff",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### File: `public/firebase-messaging-sw.js`
```javascript
// Service worker for FCM background notifications
// importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js')
// importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js')
//
// Initialize Firebase with config
// const messaging = firebase.messaging()
//
// messaging.onBackgroundMessage((payload) => {
//   const { title, body, icon, click_action } = payload.notification
//   self.registration.showNotification(title, {
//     body, icon: icon || '/icons/icon-192.png',
//     badge: '/icons/badge-72.png',
//     data: { url: click_action || '/dashboard' },
//     actions: [{ action: 'open', title: 'Open Chronos' }]
//   })
// })
//
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close()
//   event.waitUntil(clients.openWindow(event.notification.data.url))
// })
```

---

## 13. Deployment Configuration

### Dockerfile (Complete)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### cloudbuild.yaml (Complete)
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/chronos', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/chronos']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'chronos'
      - '--image=gcr.io/$PROJECT_ID/chronos'
      - '--region=asia-south1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=1Gi'
      - '--cpu=1'
      - '--min-instances=0'
      - '--max-instances=10'
      - '--set-env-vars=NODE_ENV=production'
      - '--timeout=300'
images:
  - 'gcr.io/$PROJECT_ID/chronos'
```

### Deployment Checklist
```bash
# 1. Create GCP project
gcloud projects create chronos-hackathon --name="Chronos"
gcloud config set project chronos-hackathon

# 2. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  firestore.googleapis.com fcm.googleapis.com \
  calendar-json.googleapis.com gmail.googleapis.com tasks.googleapis.com \
  aiplatform.googleapis.com

# 3. Create Firebase project (via Firebase Console)
# 4. Enable Firestore, Auth (Google provider), Cloud Messaging

# 5. Set environment variables in Cloud Run
gcloud run services update chronos --region=asia-south1 \
  --set-env-vars="VERTEX_PROJECT_ID=xxx,VERTEX_LOCATION=xxx,NEXT_PUBLIC_FIREBASE_API_KEY=xxx,..."

# 6. Deploy
gcloud builds submit --config cloudbuild.yaml

# 7. Get URL
gcloud run services describe chronos --region=asia-south1 --format='value(status.url)'
```

---

## 14. Error Handling Patterns

```typescript
// === API Route Error Handler ===
// Every API route should use this pattern:
//
// try {
//   // ... main logic
//   return NextResponse.json({ success: true, data: result });
// } catch (error) {
//   console.error(`[API_NAME] Error:`, error);
//   
//   if (error instanceof AuthError) {
//     return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
//   }
//   if (error instanceof ValidationError) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 400 });
//   }
//   return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
// }

// === Gemini API Error Handler ===
// Wrap all Gemini calls in retry logic:
// - If RATE_LIMITED: Wait 1s and retry (up to 3 times)
// - If SAFETY_BLOCKED: Return fallback response
// - If TIMEOUT: Return "AI is thinking..." message and retry
// - If API_KEY_INVALID: Throw critical error

// === Firestore Error Handler ===
// - Permission denied: Re-authenticate user
// - Not found: Return appropriate 404
// - Quota exceeded: Show toast notification

// === Client-Side Error Boundary ===
// Create ErrorBoundary component wrapping main content
// On error: Show friendly error card with "Retry" button
// Log error to console
```

---

## 15. State Management Patterns

```typescript
// === No external state library needed ===
// Use React Context + useReducer for complex state
// Use React Query pattern (fetch + cache) for API data
// Use Firestore real-time listeners for live data

// === Context Architecture ===
// AuthContext: User auth state + profile
// DemoContext: Demo mode state + mock data
// ToastContext: Toast notification queue
// NotificationContext: Push + in-app notifications

// === Data Flow ===
// 1. Real-time: Firestore onSnapshot → React state → UI
// 2. AI Chat: SSE stream → message append → auto-scroll
// 3. Task CRUD: Optimistic update → API call → Firestore write → onSnapshot confirms
// 4. Gamification: Task complete → XP calculation (client) → Firestore write → XP bar update

// === Local Storage Keys ===
// 'chronos-chat-sidebar-open': boolean (persist sidebar state)
// 'chronos-task-view': 'board' | 'list' | 'calendar' (persist view preference)
// 'chronos-demo-dismissed': boolean (don't show demo prompt again)
// 'chronos-tour-completed': boolean (don't show tour again)
```

---

## Summary: File Count & Complexity

| Category | Files | Complexity |
|---|---|---|
| Config | 7 | Low |
| Types | 1 | Medium |
| Firebase | 2 | Medium |
| Auth | 3 | High |
| AI Agents | 8 | High |
| API Routes | 11 | High |
| UI Components | 7 | Medium |
| Feature Components | 8 | High |
| Pages | 9 | Medium-High |
| Hooks | 6 | Medium |
| Demo | 2 | Medium |
| PWA | 2 | Low |
| Deployment | 2 | Low |
| **Total** | **68 files** | |

This specification, combined with `implementation_plan.md`, contains everything needed to generate the complete Chronos codebase.
