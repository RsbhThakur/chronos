// All tool (function) declarations for Gemini function calling.
// Each tool has: name, description, parameters (JSON Schema).

export const coreAgentTools = [
  {
    functionDeclarations: [
      {
        name: 'createTask',
        description: 'Create a new task for the user',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Task title' },
            description: { type: 'STRING', description: 'Task description' },
            priority: { 
              type: 'STRING', 
              description: 'Task priority',
              enum: ['critical', 'high', 'medium', 'low']
            },
            deadline: { type: 'STRING', description: 'ISO 8601 deadline timestamp' },
            estimatedMinutes: { type: 'INTEGER', description: 'Estimated time in minutes' },
            category: { type: 'STRING', description: 'Task category (e.g. Work, Study, Health)' },
            tags: { 
              type: 'ARRAY', 
              description: 'Optional tags',
              items: { type: 'STRING' }
            }
          },
          required: ['title', 'priority', 'deadline', 'estimatedMinutes', 'category']
        }
      },
      {
        name: 'updateTask',
        description: 'Update an existing task for the user',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskId: { type: 'STRING', description: 'The unique ID of the task to update' },
            updates: {
              type: 'OBJECT',
              description: 'Properties to update',
              properties: {
                title: { type: 'STRING' },
                description: { type: 'STRING' },
                status: { type: 'STRING', enum: ['todo', 'in_progress', 'completed', 'overdue', 'rescued'] },
                priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
                deadline: { type: 'STRING' },
                estimatedMinutes: { type: 'INTEGER' },
                actualMinutes: { type: 'INTEGER' },
                category: { type: 'STRING' },
                tags: { type: 'ARRAY', items: { type: 'STRING' } }
              }
            }
          },
          required: ['taskId', 'updates']
        }
      },
      {
        name: 'completeTask',
        description: 'Mark a task as completed',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskId: { type: 'STRING', description: 'The ID of the task to complete' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'deleteTask',
        description: 'Delete an existing task',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskId: { type: 'STRING', description: 'The ID of the task to delete' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'listTasks',
        description: "List the user's tasks with optional filters",
        parameters: {
          type: 'OBJECT',
          properties: {
            filter: {
              type: 'OBJECT',
              properties: {
                status: { type: 'STRING', enum: ['todo', 'in_progress', 'completed', 'overdue', 'rescued'] },
                priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
                dueBefore: { type: 'STRING', description: 'ISO 8601 timestamp' }
              }
            },
            limit: { type: 'INTEGER', description: 'Maximum number of tasks to return' }
          }
        }
      },
      {
        name: 'getUpcomingDeadlines',
        description: 'Get tasks with deadlines in the next N hours',
        parameters: {
          type: 'OBJECT',
          properties: {
            hoursAhead: { type: 'INTEGER', description: 'Number of hours ahead to check' }
          },
          required: ['hoursAhead']
        }
      },
      {
        name: 'activateRescueMode',
        description: 'Activate Rescue Mode for a task approaching its deadline',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskId: { type: 'STRING', description: 'The ID of the task' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'generateGhostWorkerDraft',
        description: 'Generate a draft deliverable for a task using Ghost Worker',
        parameters: {
          type: 'OBJECT',
          properties: {
            taskId: { type: 'STRING', description: 'The ID of the task' },
            deliverableType: { 
              type: 'STRING', 
              enum: ['email', 'document', 'presentation', 'code', 'agenda'] 
            },
            additionalContext: { type: 'STRING', description: 'Any extra details/instructions' }
          },
          required: ['taskId', 'deliverableType']
        }
      },
      {
        name: 'decomposeGoal',
        description: 'Break down a high-level goal into actionable tasks with estimates',
        parameters: {
          type: 'OBJECT',
          properties: {
            goalTitle: { type: 'STRING', description: 'Title of the goal' },
            goalDescription: { type: 'STRING', description: 'Description of the goal' },
            deadline: { type: 'STRING', description: 'ISO 8601 final deadline' },
            context: { type: 'STRING', description: 'Additional context for decomposition' }
          },
          required: ['goalTitle', 'goalDescription', 'deadline']
        }
      },
      {
        name: 'getProductivityInsights',
        description: 'Get AI-generated productivity insights and analytics',
        parameters: {
          type: 'OBJECT',
          properties: {
            timeRange: { type: 'STRING', enum: ['today', 'week', 'month'] }
          },
          required: ['timeRange']
        }
      },
      {
        name: 'getBottleneckForecast',
        description: 'Predict upcoming bottlenecks based on task load and past patterns',
        parameters: {
          type: 'OBJECT',
          properties: {
            daysAhead: { type: 'INTEGER', description: 'Number of days ahead to forecast' }
          },
          required: ['daysAhead']
        }
      },
      {
        name: 'createCalendarEvent',
        description: 'Create a Google Calendar event',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Event title' },
            startTime: { type: 'STRING', description: 'ISO 8601 start time' },
            endTime: { type: 'STRING', description: 'ISO 8601 end time' },
            description: { type: 'STRING', description: 'Event description' }
          },
          required: ['title', 'startTime', 'endTime']
        }
      },
      {
        name: 'createGoal',
        description: 'Create a new goal for the user',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Goal title' },
            description: { type: 'STRING', description: 'Goal description' },
            deadline: { type: 'STRING', description: 'ISO 8601 deadline' }
          },
          required: ['title', 'description', 'deadline']
        }
      },
      {
        name: 'logHabitCompletion',
        description: 'Log a habit as completed for today',
        parameters: {
          type: 'OBJECT',
          properties: {
            habitId: { type: 'STRING', description: 'The ID of the habit to complete' }
          },
          required: ['habitId']
        }
      }
    ]
  }
];
