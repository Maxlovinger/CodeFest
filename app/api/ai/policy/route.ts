import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
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
          statsStr = `\nNeighborhood data - Vacant: ${rows[0].vacant}, Violations: ${rows[0].violations}, Evictions: ${rows[0].evictions}`;
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

    return await streamHolmesText({
      messages: [
        { role: 'system', content: HOLMES_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1500,
      temperature: 0.65,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
