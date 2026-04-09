import { neon } from '@neondatabase/serverless';
import { requireCfVar } from '../cf-env';

async function getSql() {
  return neon(await requireCfVar('DATABASE_URL'));
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const sql = await getSql();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = params?.length
    ? await sql.query(text, params)
    : await sql.query(text);
  return (result.rows ?? result) as T[];
}

export async function transaction(texts: string[]): Promise<void> {
  const statements = texts.map(text => text.trim()).filter(Boolean);
  if (!statements.length) return;

  const sql = await getSql();
  await sql.transaction(statements.map(statement => sql.query(statement)));
}
