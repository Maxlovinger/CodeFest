/**
 * RAG helpers - query Pinecone and format retrieved context for the LLM.
 */
import { embedQuery, getIndex } from './pinecone';

export interface RagChunk {
  id: string;
  score: number;
  type: string;
  text: string;
}

/**
 * Retrieve the top-k most relevant chunks from Pinecone for a given query.
 * Returns an empty array gracefully if the index is not yet populated,
 * or if the call exceeds the timeout (default 4s) — so a slow Pinecone
 * response never blocks an AI reply.
 */
export async function retrieveContext(query: string, topK = 4, timeoutMs = 4000): Promise<RagChunk[]> {
  try {
    const fetch = async (): Promise<RagChunk[]> => {
      const vector = await embedQuery(query);
      const index = await getIndex();
      const results = await index.query({ vector, topK, includeMetadata: true });
      return (results.matches || [])
        .filter(m => m.score && m.score > 0.35)
        .map(m => ({
          id: m.id,
          score: m.score ?? 0,
          type: (m.metadata?.type as string) ?? 'unknown',
          text: (m.metadata?.text as string) ?? '',
        }));
    };

    const timeout = new Promise<RagChunk[]>((_, reject) =>
      setTimeout(() => reject(new Error('RAG timeout')), timeoutMs)
    );

    return await Promise.race([fetch(), timeout]);
  } catch {
    // Index not ready, timeout, or no data — degrade gracefully
    return [];
  }
}

/**
 * Format retrieved chunks into a compact context block for the LLM.
 */
export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return '';
  const body = chunks
    .map((c, i) => `[${i + 1}] (${c.type}, relevance ${c.score.toFixed(2)}) ${c.text}`)
    .join('\n');
  return `\n\n--- Retrieved Philadelphia evidence (RAG) ---\nUse this evidence when it is relevant. If the evidence is weak or unrelated, say so plainly instead of forcing it.\n${body}\n---`;
}
