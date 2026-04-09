import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET(req: NextRequest) {
  try {
    await migrate();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const action = searchParams.get('action') || '';

    const params: unknown[] = [limit];
    let where = '';
    if (action && action !== 'all') {
      params.unshift(action);
      where = 'WHERE action = $1';
    }

    const rows = await query(`
      SELECT source, event_timestamp, request_id, api_key, agent_id, mode, event_type, severity,
             action, policy_trigger, reason, proposed_action, corrected_action, meta
      FROM audit_events
      ${where}
      ORDER BY event_timestamp DESC NULLS LAST, id DESC
      LIMIT $${params.length}
    `, params);

    return Response.json({ events: rows });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
