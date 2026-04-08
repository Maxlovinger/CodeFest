import { neon } from '@neondatabase/serverless';

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const sql = neon(process.env.DATABASE_URL!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (sql as any)(text, params ?? []);
  return result as T[];
}
