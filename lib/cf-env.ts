/**
 * On Cloudflare Workers, secrets aren't in process.env by default.
 * This reads from the Cloudflare context env object as fallback.
 *
 * The context is cached at module level so getCloudflareContext() is called
 * once per isolate lifetime rather than once per getCfVar() call.
 */
let _cfEnvCache: Record<string, string> | null = null;

async function getCfEnv(): Promise<Record<string, string>> {
  if (_cfEnvCache !== null) return _cfEnvCache;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    _cfEnvCache = env as Record<string, string>;
  } catch {
    _cfEnvCache = {};
  }
  return _cfEnvCache;
}

export async function getCfVar(key: string): Promise<string | undefined> {
  if (process.env[key]) return process.env[key];
  const env = await getCfEnv();
  return env[key];
}

export async function requireCfVar(key: string): Promise<string> {
  const value = await getCfVar(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
