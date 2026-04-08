import { neon } from '@neondatabase/serverless';

// neon() is typed as a tagged template literal but also accepts (string, params[]) at runtime
const sql = neon(process.env.DATABASE_URL!);

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (sql as any)(text, params ?? []);
  return result as T[];
}
