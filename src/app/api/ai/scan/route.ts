import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ai, getModelName } from '@/lib/ai/gemini-client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { image, userId } = body;

    const authedUserId = session?.user?.id || userId;
    if (!authedUserId && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthorized: Missing User Session' }, { status: 401 });
    }

    if (!image) {
      return NextResponse.json({ error: 'Bad Request: Image payload is required' }, { status: 400 });
    }

    // Extract mime type and clean base64 data
    let base64Data = image;
    let mimeType = 'image/png';

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const modelName = getModelName('flash');

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        `Analyze this image and extract any tasks, deadlines, assignments, or action items. For each item found, provide: 
         1. title (clear and actionable)
         2. deadline (in ISO 8601 format like "2026-06-30T12:00:00Z" if mentioned or reasonably inferred, else null)
         3. priority (infer 'critical', 'high', 'medium', or 'low' based on urgency/importance context)
         4. category (infer e.g., 'Work', 'Academics', 'Personal', 'Shopping')
         5. rawText (the visual snippet of text you extracted this from)`
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            suggestions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  deadline: { type: 'STRING', description: 'ISO 8601 format deadline or null' },
                  priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
                  category: { type: 'STRING' },
                  rawText: { type: 'STRING' }
                },
                required: ['title', 'priority', 'category']
              }
            }
          },
          required: ['suggestions']
        }
      }
    });

    const textResponse = response.text || '{}';
    const result = JSON.parse(textResponse);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Scan] Vision extraction error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
