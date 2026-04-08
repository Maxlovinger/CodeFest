/**
 * RAG helpers — query Pinecone and format retrieved context for the LLM.
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
 * Returns an empty array gracefully if the index is not yet populated.
 */
export async function retrieveContext(query: string, topK = 6): Promise<RagChunk[]> {
  try {
    const vector = await embedQuery(query);
    const index = await getIndex();
    const results = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return (results.matches || [])
      .filter(m => m.score && m.score > 0.35) // relevance threshold
      .map(m => ({
        id: m.id,
        score: m.score ?? 0,
        type: (m.metadata?.type as string) ?? 'unknown',
        text: (m.metadata?.text as string) ?? '',
      }));
  } catch {
    // Index not ready or no data yet — degrade gracefully
    return [];
  }
}

/**
 * Format retrieved chunks into a compact context block for the LLM.
 */
export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return '';
  const body = chunks
    .map((c, i) => `[${i + 1}] (${c.type}) ${c.text}`)
    .join('\n');
  return `\n\n--- Retrieved Philadelphia housing data (RAG) ---\n${body}\n---`;
}
