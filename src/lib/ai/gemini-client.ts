import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { AgentType, UserProfile, ChatMessage } from '@/types';
import { coreAgentTools } from './tools';

// Import specialized agent instructions
import { getSystemInstruction as getCoreInstruction } from './agents/core-agent';
import { getSystemInstruction as getRescueInstruction } from './agents/rescue-agent';
import { getSystemInstruction as getGhostWorkerInstruction } from './agents/ghost-worker-agent';
import { getSystemInstruction as getTimewarpInstruction } from './agents/timewarp-agent';
import { getSystemInstruction as getAccountabilityInstruction } from './agents/accountability-agent';
import { getSystemInstruction as getDecomposerInstruction } from './agents/decomposer-agent';

// Singleton instance of GoogleGenAI client configured for Vertex AI
export const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.VERTEX_PROJECT_ID,
  location: process.env.VERTEX_LOCATION || 'global',
});

/**
 * Default safety settings for all Chronos agents
 */
export const defaultSafetySettings: any[] = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

/**
 * Returns the resolved model name identifier for Vertex AI based on tier.
 */
export function getModelName(type: 'flash' | 'pro'): string {
  return type === 'flash'
    ? (process.env.GEMINI_MODEL_FLASH || 'gemini-3.5-flash')
    : (process.env.GEMINI_MODEL_PRO || 'gemini-3.1-pro');
}

/**
 * Returns a unified model wrapper compatible with content generation.
 */
export function getModel(type: 'flash' | 'pro') {
  const modelName = getModelName(type);
  return {
    generateContent: async (contents: any, config?: any) => {
      let requestParams: any = { model: modelName };
      if (typeof contents === 'object' && contents !== null && !Array.isArray(contents) && ('contents' in contents)) {
        requestParams = { ...requestParams, ...contents };
      } else {
        requestParams.contents = contents;
        if (config) {
          requestParams.config = {
            safetySettings: defaultSafetySettings,
            ...config
          };
        } else {
          requestParams.config = { safetySettings: defaultSafetySettings };
        }
      }
      return ai.models.generateContent(requestParams);
    },
    generateContentStream: async (contents: any, config?: any) => {
      let requestParams: any = { model: modelName };
      if (typeof contents === 'object' && contents !== null && !Array.isArray(contents) && ('contents' in contents)) {
        requestParams = { ...requestParams, ...contents };
      } else {
        requestParams.contents = contents;
        if (config) {
          requestParams.config = {
            safetySettings: defaultSafetySettings,
            ...config
          };
        } else {
          requestParams.config = { safetySettings: defaultSafetySettings };
        }
      }
      return ai.models.generateContentStream(requestParams);
    }
  };
}

/**
 * Resolves the appropriate model tier ('flash' or 'pro') for each agent type.
 */
export function getAgentModelType(agentType: AgentType): 'flash' | 'pro' {
  switch (agentType) {
    case 'rescue':
    case 'ghost-worker':
    case 'decomposer':
      return 'pro';
    default:
      return 'flash';
  }
}

/**
 * Dynamically builds the system instructions for each agent based on user profile and personality traits.
 */
export function getAgentSystemInstruction(agentType: AgentType, userProfile: UserProfile): string {
  switch (agentType) {
    case 'core':
      return getCoreInstruction(userProfile);
    case 'rescue':
      return getRescueInstruction(userProfile);
    case 'ghost-worker':
      return getGhostWorkerInstruction(userProfile);
    case 'timewarp':
      return getTimewarpInstruction(userProfile);
    case 'accountability':
      return getAccountabilityInstruction(userProfile);
    case 'decomposer':
      return getDecomposerInstruction(userProfile);
    default:
      return 'You are Chronos, an AI Time Guardian.';
  }
}

/**
 * Creates and initializes a stateful chat session using the singleton Vertex AI client.
 */
export function createAgentChat(
  agentType: AgentType,
  userProfile: UserProfile,
  conversationHistory: ChatMessage[]
) {
  const modelTier = getAgentModelType(agentType);
  const modelName = getModelName(modelTier);
  const systemInstruction = getAgentSystemInstruction(agentType, userProfile);

  // Map application ChatMessage to GoogleGenAI Content format
  // Filter out system messages since system instructions are configured in the config
  const history = conversationHistory
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts = msg.content ? [{ text: msg.content }] : [];
      return { role, parts };
    });

  // Config includes system instruction, tools, and safety settings
  const config: any = {
    systemInstruction,
    safetySettings: defaultSafetySettings,
  };

  if (agentType === 'core') {
    config.tools = coreAgentTools;
  }

  // Create stateful chat session
  return ai.chats.create({
    model: modelName,
    history,
    config,
  });
}

/**
 * Generates content using a schema, validates it using a Zod schema,
 * and falls back to a default value if validation or safety blocks occur.
 */
export async function generateStructuredContent<T>({
  agentType,
  userProfile,
  prompt,
  responseSchema,
  zodSchema,
  fallbackValue,
}: {
  agentType: AgentType;
  userProfile: UserProfile;
  prompt: string;
  responseSchema: any;
  zodSchema: z.ZodSchema<T>;
  fallbackValue: T;
}): Promise<T> {
  const modelTier = getAgentModelType(agentType);
  const modelName = getModelName(modelTier);
  const systemInstruction = getAgentSystemInstruction(agentType, userProfile);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        safetySettings: defaultSafetySettings,
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      console.warn(`[gemini-client] Response blocked by safety settings for ${agentType}. Using fallback.`);
      return fallbackValue;
    }

    const rawJson = response.text || candidate?.content?.parts?.[0]?.text;
    if (!rawJson) {
      console.warn(`[gemini-client] Empty response returned for ${agentType}. Using fallback.`);
      return fallbackValue;
    }

    const parsedJson = JSON.parse(rawJson);
    const validated = zodSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.warn(`[gemini-client] Validation failed for ${agentType}:`, validated.error.message);
      return fallbackValue;
    }

    return validated.data;
  } catch (error) {
    console.error(`[gemini-client] Error calling model or parsing response for ${agentType}:`, error);
    return fallbackValue;
  }
}
