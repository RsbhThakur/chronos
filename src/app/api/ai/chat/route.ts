import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDb } from '@/lib/firebase-admin';
import { ai, getModelName, getAgentModelType, getAgentSystemInstruction, defaultSafetySettings } from '@/lib/ai/gemini-client';
import { coreAgentTools } from '@/lib/ai/tools';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { ChatMessage, ToolCall } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    const authedUserId = session?.user?.id || userId;
    if (!authedUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User Session' }, { status: 401 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Bad Request: Missing conversationId' }, { status: 400 });
    }

    const convRef = adminDb.collection('users').doc(authedUserId).collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: convSnap.data()?.messages || [] });
  } catch (err: any) {
    console.error('[API Chat] History retrieval error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  // Create stream
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 1. Authenticate request (getServerSession)
        const session = await getServerSession(authOptions);
        
        const body = await req.json().catch(() => ({}));
        const { message, conversationId: reqConversationId, userId } = body;

        const authedUserId = session?.user?.id || userId;

        if (!authedUserId) {
          sendEvent({ type: 'error', error: 'Unauthorized: Missing User Session' });
          controller.close();
          return;
        }

        if (!message) {
          sendEvent({ type: 'error', error: 'Bad Request: Message content is required' });
          controller.close();
          return;
        }

        const conversationId = reqConversationId || uuidv4();

        // 2. Fetch user profile from Firestore
        const userSnap = await adminDb.collection('users').doc(authedUserId).get();
        let userProfile = userSnap.data();

        if (!userProfile) {
          // Default fallback profile for testing/development
          userProfile = {
            id: authedUserId,
            displayName: session?.user?.name || 'Chronos User',
            email: session?.user?.email || '',
            photoURL: session?.user?.image || '',
            mode: 'student',
            personality: {
              workStyle: 'mixed',
              motivationType: 'encouragement',
              communicationStyle: 'casual',
              timezone: 'UTC',
              peakHours: [9, 10, 11, 14, 15, 16],
            },
            preferences: {
              gamificationEnabled: true,
              ghostWorkerEnabled: true,
              rescueModeEnabled: true,
              voiceEnabled: false,
              notificationChannels: ['inApp'],
            },
            onboardingCompleted: true,
            createdAt: new Date(),
          };
        }

        // 3. Fetch conversation history from Firestore
        const convRef = adminDb.collection('users').doc(authedUserId).collection('conversations').doc(conversationId);
        const convSnap = await convRef.get();
        const history: ChatMessage[] = convSnap.exists ? (convSnap.data()?.messages || []) : [];

        // 4. Map message history + new message to Gemini Content parts
        const contents: any[] = [];
        for (const msg of history) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          const parts: any[] = [];
          if (msg.content) {
            parts.push({ text: msg.content });
          }
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            parts.push(...msg.toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } })));
          }
          contents.push({ role, parts });
        }

        // Append the new user message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        // 5. Get model configuration details
        const modelTier = getAgentModelType('core');
        const modelName = getModelName(modelTier);
        const systemInstruction = getAgentSystemInstruction('core', userProfile as any);

        // Send conversationId to client first so it knows what thread it's on
        sendEvent({ type: 'setup', conversationId });

        // 6. Manual function execution loop
        let loopCount = 0;
        const maxLoops = 5;
        let currentResponseText = '';
        const currentToolCalls: ToolCall[] = [];

        while (loopCount < maxLoops) {
          loopCount++;

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction,
              tools: coreAgentTools as any,
              safetySettings: defaultSafetySettings,
            }
          });

          let hasFunctionCalls = false;
          let textAccumulated = '';
          const turnFunctionCalls: any[] = [];

          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              textAccumulated += text;
              sendEvent({ type: 'text', content: text });
            }

            const functionCalls = chunk.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              hasFunctionCalls = true;
              turnFunctionCalls.push(...functionCalls);
            }
          }

          if (hasFunctionCalls && turnFunctionCalls.length > 0) {
            const toolResults: any[] = [];

            // Add model turn representing function calls to contents array
            contents.push({
              role: 'model',
              parts: turnFunctionCalls.map(fc => ({ functionCall: { name: fc.name, args: fc.args } }))
            });

            for (const fc of turnFunctionCalls) {
              sendEvent({
                type: 'tool_call',
                name: fc.name,
                args: fc.args
              });

              let result;
              try {
                result = await executeToolCall(fc.name, fc.args, authedUserId, session);
              } catch (err: any) {
                result = { error: err.message || 'Tool execution failed' };
              }

              const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

              sendEvent({
                type: 'tool_result',
                name: fc.name,
                result: resultStr
              });

              toolResults.push({
                name: fc.name,
                result: result
              });

              currentToolCalls.push({
                name: fc.name,
                args: fc.args,
                result: resultStr
              });
            }

            // Add user turn containing function responses to contents array
            contents.push({
              role: 'user',
              parts: toolResults.map(tr => ({
                functionResponse: {
                  name: tr.name,
                  response: typeof tr.result === 'object' ? tr.result : { result: tr.result }
                }
              }))
            });

            // Re-call model to process tool output
            continue;
          } else {
            currentResponseText = textAccumulated;
            break;
          }
        }

        // 7. Save conversation to Firestore
        const userMessageObj: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: message,
          timestamp: new Date()
        };

        const assistantMessageObj: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: currentResponseText,
          timestamp: new Date(),
          toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined
        };

        const updatedMessages = [
          ...history,
          userMessageObj,
          assistantMessageObj
        ];

        // Write back to Firestore
        await convRef.set({
          id: conversationId,
          userId: authedUserId,
          messages: updatedMessages,
          updatedAt: new Date(),
          createdAt: convSnap.exists ? (convSnap.data()?.createdAt || new Date()) : new Date(),
        }, { merge: true });

        // Close stream
        sendEvent({ type: 'done' });
        controller.close();

      } catch (err: any) {
        console.error('[API Chat] Error in SSE loop:', err);
        sendEvent({ type: 'error', error: err.message || 'Internal Server Error' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
