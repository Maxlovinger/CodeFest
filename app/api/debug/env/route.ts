export async function GET() {
  const keys = ['GROQ_API_KEY', 'PINECONE_API_KEY', 'DATABASE_URL'];
  const result: Record<string, string> = {};

  for (const key of keys) {
    if (process.env[key]) {
      result[key] = 'process.env ✓';
      continue;
    }
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      const val = (env as Record<string, string>)[key];
      result[key] = val ? 'cf-env ✓' : 'cf-env: key missing';
    } catch (e) {
      result[key] = `cf-env error: ${String(e).slice(0, 100)}`;
    }
  }

  // Check Cloudflare AI binding
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const ai = (env as Record<string, unknown>).AI;
    if (ai && typeof (ai as Record<string, unknown>).run === 'function') {
      result['CF_AI_BINDING'] = 'found ✓';
    } else {
      result['CF_AI_BINDING'] = `missing (env.AI = ${JSON.stringify(ai)?.slice(0, 80)})`;
    }
  } catch (e) {
    result['CF_AI_BINDING'] = `error: ${String(e).slice(0, 100)}`;
  }

  return Response.json(result);
}
