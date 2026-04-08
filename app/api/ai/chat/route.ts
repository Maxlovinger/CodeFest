import { NextRequest } from 'next/server';
import { getGroq, HOLMES_SYSTEM_PROMPT, MODEL } from '@/lib/ai';
import { retrieveContext, formatRagContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();

  // Last user message is the query we use for RAG retrieval
  const lastUserMsg: string = messages.findLast((m: { role: string; content: string }) => m.role === 'user')?.content ?? '';

  // Retrieve relevant context from Pinecone in parallel with building the prompt
  const ragChunks = await retrieveContext(lastUserMsg, 6);
  const ragContext = formatRagContext(ragChunks);

  const systemPrompt =
    HOLMES_SYSTEM_PROMPT +
    ragContext +
    (context ? `\n\nMap state: ${context}` : '');

  const groq = await getGroq();
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 600,
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
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
