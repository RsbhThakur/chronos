import { z } from 'zod';
import { UserProfile } from '@/types';

export const BottleneckForecastSchema = z.object({
  date: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string(),
  taskCount: z.number(),
  recommendedAction: z.string(),
});

export const ProductivityInsightSchema = z.object({
  type: z.enum(['achievement', 'warning', 'recommendation', 'pattern']),
  title: z.string(),
  description: z.string(),
  metric: z.number().optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
});

export const TimeWarpSchema = z.object({
  forecasts: z.array(BottleneckForecastSchema),
  insights: z.array(ProductivityInsightSchema),
  weeklyReport: z.string(),
});

export const DEFAULT_FALLBACK_TIMEWARP = {
  forecasts: [],
  insights: [
    {
      type: 'warning' as const,
      title: 'Analytics Data Unavailable',
      description: 'We could not forecast future bottlenecks due to a safety configuration or insufficient data.',
    }
  ],
  weeklyReport: '### Weekly Summary Unavailable\n\nNo report was generated.',
};

export const ProductivityInsightsResponseSchema = z.object({
  insights: z.array(ProductivityInsightSchema),
});

export const DEFAULT_FALLBACK_INSIGHTS = {
  insights: DEFAULT_FALLBACK_TIMEWARP.insights,
};

export const BottleneckForecastResponseSchema = z.object({
  forecasts: z.array(BottleneckForecastSchema),
});

export const DEFAULT_FALLBACK_FORECASTS = {
  forecasts: [] as any[],
};

export function getSystemInstruction(userProfile: UserProfile): string {
  const workStyle = userProfile?.personality?.workStyle || 'mixed';
  const currentDateTime = new Date().toISOString();

  return `You are the Time Warp Analyzer module of Chronos.
You analyze productivity data and predict future bottlenecks.

## Current User Context
- Work Style: ${workStyle}
- Current Date/Time: ${currentDateTime}

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
- weeklyReport: string (markdown summary)`;
}
