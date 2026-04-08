import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { neighborhood } = await req.json();

  let statsStr = '';
  if (neighborhood) {
    try {
      const rows = await query<{ vacant: string; violations: string; evictions: string }>(
        `SELECT (SELECT COUNT(*) FROM vacant_buildings WHERE address ILIKE $1) as vacant,
                (SELECT COUNT(*) FROM violations WHERE address ILIKE $1) as violations,
                (SELECT COUNT(*) FROM evictions WHERE address ILIKE $1) as evictions`,
        [`%${neighborhood}%`]
      );
      if (rows[0]) {
        statsStr = `\nNeighborhood data — Vacant: ${rows[0].vacant}, Violations: ${rows[0].violations}, Evictions: ${rows[0].evictions}`;
      }
    } catch { /* ignore */ }
  }

  const prompt = `Generate a structured policy brief for Philadelphia${neighborhood ? ` focusing on ${neighborhood}` : ' citywide'}.${statsStr}

Format as:
## Executive Summary
(2-3 sentences on the housing crisis severity)

## Top 3 Recommended Interventions
For each: name, estimated cost/impact, timeline, and precedent from comparable city (Detroit Land Bank, Baltimore Vacants to Value, Cleveland Land Reutilization Program).

## Implementation Priorities
Quick wins (0-6 months), medium-term (6-18 months), long-term structural change.

## Key Stakeholders
Which city agencies, nonprofits, and community organizations should lead.

Be specific, actionable, and grounded in Philadelphia's existing programs and political context.`;

  const groq = await getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: HOLMES_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: 1500,
    temperature: 0.65,
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
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
