import { query } from '@/lib/db';

export async function GET() {
  try {
    const summary = await query<{
      total_events: string;
      blocked: string;
      interrupted: string;
      escalated: string;
      high_severity: string;
      last_event: string;
    }>(`
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE action = 'blocked') as blocked,
        COUNT(*) FILTER (WHERE action = 'interrupted') as interrupted,
        COUNT(*) FILTER (WHERE action = 'escalated') as escalated,
        COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
        MAX(event_timestamp) as last_event
      FROM audit_events
    `);

    const actions = await query<{
      action: string;
      count: string;
    }>(`
      SELECT COALESCE(action, 'observed') as action, COUNT(*) as count
      FROM audit_events
      GROUP BY COALESCE(action, 'observed')
      ORDER BY count DESC
    `);

    const policies = await query<{
      policy_trigger: string;
      count: string;
    }>(`
      SELECT COALESCE(policy_trigger, event_type, 'unknown') as policy_trigger, COUNT(*) as count
      FROM audit_events
      GROUP BY COALESCE(policy_trigger, event_type, 'unknown')
      ORDER BY count DESC
      LIMIT 6
    `);

    return Response.json({
      summary: summary[0] ?? null,
      actions,
      policies,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
