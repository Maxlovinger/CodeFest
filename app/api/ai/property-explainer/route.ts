import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { retrieveContext, formatRagContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { property } = await req.json();

    if (!property) {
      return Response.json({ error: 'property required' }, { status: 400 });
    }

    const blightScore = property.blight_score || 0;
    const riskTier = blightScore >= 80 ? 'CRITICAL' : blightScore >= 60 ? 'HIGH' : blightScore >= 40 ? 'MEDIUM' : 'LOW';

    // Retrieve similar properties and neighborhood context from RAG
    const ragQuery = `vacant property ${property.address} blight score ${blightScore} ${riskTier} risk ${property.zip_code || ''} violations`;
    const ragChunks = await retrieveContext(ragQuery, 5);
    const ragContext = formatRagContext(ragChunks);

    const prompt = `Analyze this Philadelphia property's blight risk, then give the 2-3 most actionable interventions.

Property:
- Address: ${property.address}
- Owner: ${property.owner || 'Unknown'}
- Market Value: ${property.market_value ? `$${parseInt(property.market_value).toLocaleString()}` : 'Unknown'}
- Blight Score: ${blightScore}/100 (${riskTier} risk)
- Category: ${property.category || 'Unknown'}
- Violations: ${property.violations?.length || 0} recorded`;

    return await streamHolmesText({
      messages: [
        { role: 'system', content: HOLMES_SYSTEM_PROMPT + ragContext },
        { role: 'user', content: prompt },
      ],
      maxTokens: 500,
      temperature: 0.6,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
