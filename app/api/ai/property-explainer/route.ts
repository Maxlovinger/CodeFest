import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { property } = await req.json();

  if (!property) {
    return Response.json({ error: 'property required' }, { status: 400 });
  }

  const blightScore = property.blight_score || 0;
  const riskTier = blightScore >= 80 ? 'CRITICAL' : blightScore >= 60 ? 'HIGH' : blightScore >= 40 ? 'MEDIUM' : 'LOW';

  const prompt = `Analyze this Philadelphia property and explain its blight risk score, then list the 3-4 most effective interventions.

Property:
- Address: ${property.address}
- Owner: ${property.owner || 'Unknown'}
- Market Value: ${property.market_value ? `$${parseInt(property.market_value).toLocaleString()}` : 'Unknown'}
- Blight Score: ${blightScore}/100 (${riskTier} risk)
- Category: ${property.category || 'Unknown'}
- Violations: ${property.violations?.length || 0} recorded

Explain:
1. Why this property has its blight score (2-3 sentences)
2. Top interventions from: Philadelphia Land Bank acquisition, LandCare stabilization program, L&I enforcement escalation, Philadelphia Housing Authority programs, conservatorship (Act 135), Community Land Trust. Be specific about which apply here.`;

  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: HOLMES_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: 600,
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
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
