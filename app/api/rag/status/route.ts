import { getPinecone, INDEX_NAME } from '@/lib/pinecone';

export async function GET() {
  try {
    const pc = await getPinecone();
    const { indexes } = await pc.listIndexes();
    const idx = indexes?.find(i => i.name === INDEX_NAME);
    if (!idx) {
      return Response.json({ ready: false, vectorCount: 0, message: 'Index not created yet' });
    }
    const index = pc.index(INDEX_NAME);
    const stats = await index.describeIndexStats();
    return Response.json({
      ready: true,
      vectorCount: stats.totalRecordCount ?? 0,
      dimension: idx.dimension,
      status: idx.status?.ready ? 'ready' : 'initializing',
    });
  } catch (err) {
    return Response.json({ ready: false, vectorCount: 0, error: String(err) });
  }
}
