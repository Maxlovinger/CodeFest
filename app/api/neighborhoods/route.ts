import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query(`
      SELECT id, name, vacant_count, violation_count, eviction_count, avg_blight_score, risk_tier, ai_summary, geojson
      FROM neighborhoods
      ORDER BY avg_blight_score DESC
    `);
    return Response.json({ neighborhoods: rows });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
