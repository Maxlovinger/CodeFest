import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { query } from '@/lib/db/index';
import { retrieveContext, formatRagContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    const q = question || 'Analyze the current trends in Philadelphia housing crisis data and provide key insights.';

    // RAG + live stats in parallel
    const [vbStats, violStats, evictStats, ragChunks] = await Promise.all([
      query<{ total: string; avg_blight: string; critical: string }>(
        `SELECT COUNT(*) as total, AVG(blight_score) as avg_blight,
                SUM(CASE WHEN blight_score >= 80 THEN 1 ELSE 0 END) as critical
         FROM vacant_buildings`
      ).catch(() => []),
      query<{ total: string; structural: string; electrical: string; sanitation: string }>(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN violation_type ILIKE '%struct%' OR violation_type ILIKE '%exterior%' THEN 1 ELSE 0 END) as structural,
                SUM(CASE WHEN violation_type ILIKE '%electr%' THEN 1 ELSE 0 END) as electrical,
                SUM(CASE WHEN violation_type ILIKE '%sanit%' OR violation_type ILIKE '%rodent%' THEN 1 ELSE 0 END) as sanitation
         FROM violations`
      ).catch(() => []),
      query<{ total: string; avg_amount: string }>(
        `SELECT COUNT(*) as total, AVG(amount) as avg_amount FROM evictions`
      ).catch(() => []),
      retrieveContext(q, 6),
    ]);

    const vb = vbStats[0] ?? {};
    const vi = violStats[0] ?? {};
    const ev = evictStats[0] ?? {};
    const ragContext = formatRagContext(ragChunks);

    const dataContext = `
Current Philadelphia Housing Data:
- Vacant properties: ${vb.total || 0} (avg blight: ${Math.round(parseFloat(vb.avg_blight || '0'))}/100, critical: ${vb.critical || 0})
- Code violations: ${vi.total || 0} (structural: ${vi.structural || 0}, electrical: ${vi.electrical || 0}, sanitation: ${vi.sanitation || 0})
- Eviction filings: ${ev.total || 0} (avg judgment: $${Math.round(parseFloat(ev.avg_amount || '0'))})`;

    const groq = await getGroq();
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: HOLMES_SYSTEM_PROMPT + ragContext + dataContext },
        { role: 'user', content: q },
      ],
      stream: true,
      max_tokens: 700,
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

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Groq error';
    return new Response(`Holmes AI is unavailable right now: ${message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
