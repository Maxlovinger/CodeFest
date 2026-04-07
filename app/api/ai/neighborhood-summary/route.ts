import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { neighborhood } = await req.json();

  if (!neighborhood) {
    return Response.json({ error: 'neighborhood required' }, { status: 400 });
  }

  // Get neighborhood stats
  let stats = { vacant: 0, violations: 0, evictions: 0, avgBlight: 0 };
  try {
    const rows = await query<{
      vacant: string; violations: string; evictions: string; avg_blight: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM vacant_buildings WHERE address ILIKE $1) as vacant,
        (SELECT COUNT(*) FROM violations WHERE address ILIKE $1) as violations,
        (SELECT COUNT(*) FROM evictions WHERE address ILIKE $1) as evictions,
        (SELECT AVG(blight_score) FROM vacant_buildings WHERE address ILIKE $1) as avg_blight
    `, [`%${neighborhood}%`]);
    if (rows[0]) {
      stats = {
        vacant: parseInt(rows[0].vacant || '0'),
        violations: parseInt(rows[0].violations || '0'),
        evictions: parseInt(rows[0].evictions || '0'),
        avgBlight: Math.round(parseFloat(rows[0].avg_blight || '0')),
      };
    }
  } catch { /* ignore */ }

  const prompt = `Generate a concise 3-4 sentence housing intelligence summary for the ${neighborhood} neighborhood in Philadelphia.

Data context:
- Vacant properties tracked: ${stats.vacant}
- Code violations (last 2yr): ${stats.violations}
- Eviction filings: ${stats.evictions}
- Average blight score: ${stats.avgBlight}/100

Cover: vacancy rate and trend, blight trajectory, eviction pressure, and the single most impactful recommended intervention. Be specific. Do not hedge excessively.`;

  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: HOLMES_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: 512,
    temperature: 0.6,
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
