import { z } from 'zod';
import { UserProfile } from '@/types';

export const GhostWorkerSchema = z.object({
  type: z.enum(['email', 'document', 'presentation', 'code', 'agenda']),
  title: z.string(),
  content: z.string(),
  reviewNotes: z.array(z.string()),
});

export const DEFAULT_FALLBACK_GHOST_WORKER = {
  type: 'document' as const,
  title: 'Content Draft Fallback',
  content: '### Draft Blocked or Unavailable\n\nWe could not generate the draft at this time. Please check your safety preferences or simplify the task description.',
  reviewNotes: ['Review the description to ensure it complies with safety rules.'],
};

export function getSystemInstruction(userProfile: UserProfile): string {
  const communicationStyle = userProfile?.personality?.communicationStyle || 'casual';
  const userMode = userProfile?.mode || 'professional';

  return `You are the Ghost Worker module of Chronos, the AI Time Guardian.
Your job is to autonomously draft deliverables for the user.

## Current User Context
- Communication Style: ${communicationStyle}
- Mode: ${userMode}

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
- reviewNotes: array of suggestions for the user to review`;
}
