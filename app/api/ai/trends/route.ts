import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  let dataContext = '';
  try {
    const [vbStats, violStats, evictStats] = await Promise.all([
      query<{ total: string; avg_blight: string; critical: string }>(
        `SELECT COUNT(*) as total, AVG(blight_score) as avg_blight,
                SUM(CASE WHEN blight_score >= 80 THEN 1 ELSE 0 END) as critical
         FROM vacant_buildings`
      ),
      query<{ total: string; structural: string; electrical: string; sanitation: string }>(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN violation_type ILIKE '%struct%' OR violation_type ILIKE '%exterior%' THEN 1 ELSE 0 END) as structural,
                SUM(CASE WHEN violation_type ILIKE '%electr%' THEN 1 ELSE 0 END) as electrical,
                SUM(CASE WHEN violation_type ILIKE '%sanit%' OR violation_type ILIKE '%rodent%' THEN 1 ELSE 0 END) as sanitation
         FROM violations`
      ),
      query<{ total: string; avg_amount: string }>(
        `SELECT COUNT(*) as total, AVG(amount) as avg_amount FROM evictions`
      ),
    ]);

    dataContext = `
Current Philadelphia Housing Data:
- Vacant properties: ${vbStats[0]?.total || 0} (avg blight score: ${Math.round(parseFloat(vbStats[0]?.avg_blight || '0'))}/100, critical risk: ${vbStats[0]?.critical || 0})
- Code violations: ${violStats[0]?.total || 0} (structural: ${violStats[0]?.structural || 0}, electrical: ${violStats[0]?.electrical || 0}, sanitation: ${violStats[0]?.sanitation || 0})
- Eviction filings: ${evictStats[0]?.total || 0} (avg judgment: $${Math.round(parseFloat(evictStats[0]?.avg_amount || '0'))})`;
  } catch { /* ignore */ }

  const prompt = `${question || 'Analyze the current trends in Philadelphia housing crisis data and provide key insights.'}${dataContext}`;

  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: HOLMES_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: 800,
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
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
