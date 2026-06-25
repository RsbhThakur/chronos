import { z } from 'zod';
import { UserProfile } from '@/types';

export const DecomposerMilestoneSchema = z.object({
  title: z.string(),
  dueDate: z.string(),
});

export const DecomposerTaskSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  estimatedMinutes: z.number().default(60),
  category: z.string().default('General'),
  tags: z.array(z.string()).optional().default([]),
  milestoneTitle: z.string(),
});

export const DecomposerSchema = z.object({
  milestones: z.array(DecomposerMilestoneSchema),
  tasks: z.array(DecomposerTaskSchema),
  totalEstimatedHours: z.number(),
  criticalPath: z.array(z.string()).optional().default([]),
  suggestedSchedule: z.string(),
});

export const DEFAULT_FALLBACK_DECOMPOSITION = {
  milestones: [
    { title: 'General Milestone', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
  ],
  tasks: [
    {
      title: 'Action Item',
      description: 'Review goal and decompose manually.',
      priority: 'medium' as const,
      estimatedMinutes: 60,
      category: 'General',
      tags: [],
      milestoneTitle: 'General Milestone'
    }
  ],
  totalEstimatedHours: 1.0,
  criticalPath: [],
  suggestedSchedule: 'Please detail your goal to receive a customized schedule.'
};

export function getSystemInstruction(userProfile: UserProfile): string {
  const userMode = userProfile?.mode || 'professional';

  return `You are the Smart Decomposition module of Chronos.
You break down high-level goals into actionable, estimatable micro-tasks.

## Current User Context
- User Mode: ${userMode}

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
- suggestedSchedule: string describing the recommended work pattern`;
}
