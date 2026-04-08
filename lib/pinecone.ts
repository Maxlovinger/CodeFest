import { Pinecone } from '@pinecone-database/pinecone';
import { getCfVar } from './cf-env';

export const INDEX_NAME = 'holmes-philadelphia';
export const EMBED_MODEL = 'llama-text-embed-v2';
export const EMBED_DIM = 1024;

export async function getPinecone(): Promise<Pinecone> {
  const apiKey = await getCfVar('PINECONE_API_KEY');
  return new Pinecone({ apiKey: apiKey! });
}

export async function ensureIndex(): Promise<void> {
  const pc = await getPinecone();
  const { indexes } = await pc.listIndexes();
  const exists = indexes?.some(i => i.name === INDEX_NAME);
  if (!exists) {
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: EMBED_DIM,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
      waitUntilReady: true,
    });
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const pc = await getPinecone();
  const result = await pc.inference.embed({
    model: EMBED_MODEL,
    inputs: texts,
    parameters: { input_type: 'passage', truncate: 'END' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result as any).data.map((e: { values: number[] }) => Array.from(e.values));
}

export async function embedQuery(text: string): Promise<number[]> {
  const pc = await getPinecone();
  const result = await pc.inference.embed({
    model: EMBED_MODEL,
    inputs: [text],
    parameters: { input_type: 'query', truncate: 'END' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Array.from(((result as any).data[0] as { values: number[] }).values);
}

export async function getIndex() {
  return (await getPinecone()).index(INDEX_NAME);
}
