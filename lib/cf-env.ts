/**
 * On Cloudflare Workers, secrets aren't in process.env by default.
 * This reads from the Cloudflare context env object as fallback.
 */
export async function getCfVar(key: string): Promise<string | undefined> {
  if (process.env[key]) return process.env[key];
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return (env as Record<string, string>)[key];
  } catch {
    return undefined;
  }
}

export async function requireCfVar(key: string): Promise<string> {
  const value = await getCfVar(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
