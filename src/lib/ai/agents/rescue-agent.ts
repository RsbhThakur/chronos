import { z } from 'zod';
import { UserProfile } from '@/types';

export const RescueStepSchema = z.object({
  id: z.string(),
  timeBlock: z.string(),
  action: z.string(),
  estimatedMinutes: z.number(),
  tips: z.string(),
  canBeSkipped: z.boolean(),
  completed: z.boolean().default(false),
});

export const RescueCheckpointSchema = z.object({
  time: z.string(),
  milestone: z.string(),
  reached: z.boolean().default(false),
});

export const RescuePlanSchema = z.object({
  severity: z.enum(['yellow', 'orange', 'red']),
  totalMinutesAvailable: z.number(),
  totalMinutesNeeded: z.number(),
  feasible: z.boolean(),
  plan: z.array(RescueStepSchema),
  sacrifices: z.array(z.string()),
  motivationalMessage: z.string(),
  checkpoints: z.array(RescueCheckpointSchema),
});

export const DEFAULT_FALLBACK_RESCUE_PLAN = {
  severity: 'yellow' as const,
  totalMinutesAvailable: 0,
  totalMinutesNeeded: 0,
  feasible: false,
  plan: [],
  sacrifices: ['No sacrifices determined due to processing fallback.'],
  motivationalMessage: 'Take a deep breath. Let us take it one step at a time.',
  checkpoints: [],
};

export function getSystemInstruction(userProfile: UserProfile): string {
  const currentDateTime = new Date().toISOString();
  const userName = userProfile?.displayName || 'User';
  const userMode = userProfile?.mode || 'professional';
  const workStyle = userProfile?.personality?.workStyle || 'mixed';
  const motivationType = userProfile?.personality?.motivationType || 'encouragement';

  return `You are the Rescue Mode module of Chronos, the AI Time Guardian.
Your job is to create COMPRESSED ACTION PLANS when a user is about to miss a deadline.

## Current User Context
- Name: ${userName}
- Mode: ${userMode}
- Work Style: ${workStyle}
- Motivation Type: ${motivationType}
- Current Date/Time: ${currentDateTime}

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
- red: <1 hour remaining. Emergency mode. Maximum compression.`;
}
