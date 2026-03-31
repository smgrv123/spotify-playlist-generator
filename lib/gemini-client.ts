import { env } from '@/lib/env';
import { generateResponseSchema } from '@/lib/schemas';
import { ApiError, GenerateRequest, GenerateResponse } from '@/lib/types';
import { formatZodErrors } from '@/lib/utils';
import 'server-only';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `You are a world-class Spotify playlist curator. 
Your ONLY job is to return a strict JSON object containing a highly relevant AI-suggested playlist name and a list of tracks that flawlessly match the user's prompt. 
You must NOT output any conversational text, markdown formatting (like \`\`\`json), or explanations. 

The JSON must exactly match this schema:
{
  "suggestedName": "A catchy, relevant playlist name (max 50 chars)",
  "tracks": [
    { "title": "Track Name", "artist": "Primary Artist Name" }
  ]
}`;

export async function generatePlaylist(request: GenerateRequest): Promise<GenerateResponse> {
  const { prompt, count } = request;

  const url = `${GEMINI_API_BASE}/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Create a playlist with exactly ${count} tracks based on this theme: "${prompt}".`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      const apiErr: ApiError = {
        code: 'GENERATION_FAILED',
        message: 'Failed to communicate with the AI model.',
      };
      throw apiErr;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      const apiErr: ApiError = {
        code: 'GENERATION_EMPTY',
        message: 'The AI model returned an empty response.',
      };
      throw apiErr;
    }

    // Attempt to sanitize any stray markdown if the model hallucinated them despite responseMimeType
    const sanitizedText = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(sanitizedText);
    } catch {
      console.error('Failed to parse Gemini output as JSON:', sanitizedText);
      const apiErr: ApiError = {
        code: 'GENERATION_PARSE_ERROR',
        message: 'The AI model produced invalid JSON format.',
      };
      throw apiErr;
    }

    // Zod asserts the schema explicitly
    const validationResult = generateResponseSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error(
        'Schema validation failed for Gemini output:',
        formatZodErrors(validationResult.error)
      );
      const apiErr: ApiError = {
        code: 'GENERATION_SCHEMA_ERROR',
        message: 'The AI model produced an invalid playlist structure.',
        details: formatZodErrors(validationResult.error),
      };
      throw apiErr;
    }

    // Clean up strings natively to prevent upstream search bugs
    const cleanOutput = validationResult.data;
    cleanOutput.suggestedName = cleanOutput.suggestedName.trim();
    cleanOutput.tracks = cleanOutput.tracks
      .map((t) => ({
        title: t.title.trim(),
        artist: t.artist.trim(),
      }))
      .filter((t) => t.title.length > 0 && t.artist.length > 0);

    return cleanOutput;
  } catch (error) {
    // If it's already an ApiError structure, bubble it up. Otherwise, fall back to a generic typed shape.
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    console.error('Unexpected Gemini Error:', error);
    const apiErr: ApiError = {
      code: 'GENERATION_FATAL_ERROR',
      message: 'An unexpected error occurred during AI generation.',
    };
    throw apiErr;
  }
}
