export async function GET() {
  const keys = ['GROQ_API_KEY', 'PINECONE_API_KEY', 'DATABASE_URL'];
  const result: Record<string, string> = {};

  for (const key of keys) {
    if (process.env[key]) {
      result[key] = `process.env ✓ (${process.env[key]!.slice(0, 6)}...)`;
      continue;
    }
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      const val = (env as Record<string, string>)[key];
      result[key] = val ? `cf-env ✓ (${val.slice(0, 6)}...)` : 'cf-env: key missing';
    } catch (e) {
      result[key] = `cf-env error: ${String(e).slice(0, 100)}`;
    }
  }

  return Response.json(result);
}
