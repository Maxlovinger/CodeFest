import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_AUDIT_PROMPT, HOLMES_BEHAVIOR_PROMPT, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { formatRagContext, retrieveContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { kind, label, count, total } = await req.json();

    if (!kind || !label) {
      return Response.json({ error: 'kind and label required' }, { status: 400 });
    }

    const prompt = `Explain this Glass Box summary item in plain English for a non-technical reviewer.

Summary item:
- Kind: ${kind}
- Label: ${label}
- Count: ${count ?? 'unknown'}
- Total events loaded: ${total ?? 'unknown'}

Write 3 short parts:
1. What this item means.
2. Why it might show up often in the dashboard.
3. What a reviewer should pay attention to.

Rules:
- Keep it short, simple, and concrete.
- Do not invent product behavior beyond what the label strongly suggests.
- If the label is technical, translate it into normal language.
- If the meaning is uncertain, say that plainly and give the safest interpretation.`;

    const ragChunks = await retrieveContext(`AI safety ${kind} ${label}`, 4);
    const ragContext = formatRagContext(ragChunks);

    return await streamHolmesText({
      messages: [
        {
          role: 'system',
          content:
            HOLMES_SYSTEM_PROMPT +
            HOLMES_BEHAVIOR_PROMPT +
            HOLMES_AUDIT_PROMPT +
            ragContext +
            '\n\nCurrent UI context:\nThe user clicked a Glass Box action or policy summary item and wants a brief plain-English explanation of what it means.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 220,
      temperature: 0.3,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
