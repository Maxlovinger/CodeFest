import { neon } from '@neondatabase/serverless';
import { requireCfVar } from '../cf-env';

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const sql = neon(await requireCfVar('DATABASE_URL'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = params?.length
    ? await sql.query(text, params)
    : await sql.query(text);
  return (result.rows ?? result) as T[];
}
