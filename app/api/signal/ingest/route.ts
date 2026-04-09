import { migrate } from '@/lib/db/migrate';
import { ingestConnectivityData } from '@/lib/connectivity';

async function runIngest() {
  await migrate();
  return ingestConnectivityData();
}

export async function GET() {
  try {
    const result = await runIngest();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
