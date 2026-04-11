import { ingestAuditData } from '@/lib/audit';

export async function GET() {
  try {
    const result = await ingestAuditData();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
