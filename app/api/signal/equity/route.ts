import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET() {
  try {
    await migrate();

    const [patterns, stats] = await Promise.all([
      query<{
        geoid: string; name: string; risk_score: string; risk_tier: string;
        pct_no_internet: string; median_income: string; pct_minority: string;
        wifi_site_count: string; vacant_count: string; avg_blight: string;
        violation_count: string; double_burden_score: string;
      }>(`SELECT * FROM equity_patterns ORDER BY double_burden_score DESC LIMIT 6`),

      query<{
        total_high_risk: string; with_blight: string;
        avg_blight_in_high_risk: string; avg_income_high_risk: string;
      }>(`SELECT * FROM equity_stats ORDER BY updated_at DESC LIMIT 1`),
    ]);

    return Response.json({
      double_burden: patterns,
      stats: stats[0] ?? null,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
