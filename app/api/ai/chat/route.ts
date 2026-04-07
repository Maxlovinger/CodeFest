import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();

  // Get current stats for context
  let statsContext = '';
  try {
    const stats = await query<{ vacant_buildings: string; violations: string; evictions: string }>(
      `SELECT (SELECT COUNT(*) FROM vacant_buildings) as vacant_buildings,
              (SELECT COUNT(*) FROM violations) as violations,
              (SELECT COUNT(*) FROM evictions) as evictions`
    );
    const s = stats[0];
    statsContext = `\n\nCurrent database stats: ${s.vacant_buildings} vacant properties, ${s.violations} code violations, ${s.evictions} eviction filings tracked.`;
  } catch { /* ignore */ }

  const systemPrompt = HOLMES_SYSTEM_PROMPT + statsContext + (context ? `\n\nMap context: ${context}` : '');

  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
