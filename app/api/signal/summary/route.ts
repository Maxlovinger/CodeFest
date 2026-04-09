import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET() {
  try {
    await migrate();
    const rows = await query<{
      tract_count: string;
      wifi_sites: string;
      avg_risk: string;
      critical_tracts: string;
      avg_speed: string;
      max_updated_at: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM connectivity_tracts) as tract_count,
        (SELECT COUNT(*) FROM wifi_sites) as wifi_sites,
        (SELECT AVG(risk_score) FROM connectivity_tracts) as avg_risk,
        (SELECT COUNT(*) FROM connectivity_tracts WHERE risk_tier = 'critical') as critical_tracts,
        (SELECT AVG(speed_down_mbps) FROM wifi_sites WHERE speed_down_mbps > 0) as avg_speed,
        GREATEST(
          COALESCE((SELECT MAX(updated_at) FROM connectivity_tracts), NOW() - INTERVAL '100 years'),
          COALESCE((SELECT MAX(updated_at) FROM wifi_sites), NOW() - INTERVAL '100 years')
        ) as max_updated_at
    `);

    const topZones = await query<{
      geoid: string;
      name: string;
      risk_score: string;
      risk_tier: string;
      pct_no_internet: string;
      wifi_site_count: string;
    }>(`
      SELECT geoid, name, risk_score, risk_tier, pct_no_internet, wifi_site_count
      FROM connectivity_tracts
      ORDER BY risk_score DESC NULLS LAST
      LIMIT 5
    `);

    return Response.json({
      summary: rows[0] ?? null,
      top_zones: topZones,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
