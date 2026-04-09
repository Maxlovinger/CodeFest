import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_BEHAVIOR_PROMPT, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { retrieveContext, formatRagContext } from '@/lib/rag';

function formatUiContext(context: unknown): string {
  if (!context) return '';
  if (typeof context === 'string') return `\n\nCurrent UI context:\n${context}`;
  try {
    return `\n\nCurrent UI context:\n${JSON.stringify(context, null, 2)}`;
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    // Last user message is the query we use for RAG retrieval
    const lastUserMsg: string = messages.findLast((m: { role: string; content: string }) => m.role === 'user')?.content ?? '';
    const uiContext = formatUiContext(context);

    // Retrieve relevant context from Pinecone in parallel with building the prompt
    const ragChunks = await retrieveContext(`${lastUserMsg}\n${uiContext}`, 8);
    const ragContext = formatRagContext(ragChunks);

    const systemPrompt =
      HOLMES_SYSTEM_PROMPT +
      HOLMES_BEHAVIOR_PROMPT +
      ragContext +
      uiContext;

    return await streamHolmesText({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      maxTokens: 600,
      temperature: 0.7,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
