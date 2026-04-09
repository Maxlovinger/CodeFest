import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_AUDIT_PROMPT, HOLMES_BEHAVIOR_PROMPT, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { formatRagContext, retrieveContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { event } = await req.json();

    if (!event) {
      return Response.json({ error: 'event required' }, { status: 400 });
    }

    const action = event.action || event.event_type || 'observed event';
    const prompt = `Explain this inhibitor event in plain English for a non-technical reviewer.

Event details:
- Action: ${action}
- Severity: ${event.severity || 'not marked'}
- Timestamp: ${event.event_timestamp || 'unknown'}
- Policy trigger: ${event.policy_trigger || 'not listed'}
- Reason: ${event.reason || 'not listed'}
- Proposed action: ${event.proposed_action || 'not listed'}
- Corrected action: ${event.corrected_action || 'not listed'}
- Event type: ${event.event_type || 'not listed'}
- Mode: ${event.mode || 'not listed'}

Write 3 short parts:
1. What happened.
2. Why the system likely stepped in.
3. What a reviewer should take away.

Rules:
- Keep it brief, simple, and concrete.
- Do not invent facts that are not in the event details.
- If something is missing, say that plainly.
- Avoid jargon unless you immediately explain it.`;

    const ragChunks = await retrieveContext(
      `AI safety inhibitor event ${event.policy_trigger || ''} ${event.reason || ''} ${event.event_type || ''}`,
      4
    );
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
            '\n\nCurrent UI context:\nThe user clicked a recent Glass Box timeline event and wants a short plain-English explanation of what it means.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 260,
      temperature: 0.35,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
