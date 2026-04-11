import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET() {
  try {
    await migrate();

    // For each high-risk connectivity tract, count nearby vacant buildings and violations
    // using a bounding box (~0.012 degrees ≈ 1 mile radius) around each tract centroid.
    // This surfaces areas hit hard by BOTH connectivity gaps and housing blight.
    const doubleBurden = await query<{
      geoid: string;
      name: string;
      risk_score: string;
      risk_tier: string;
      pct_no_internet: string;
      median_income: string;
      pct_minority: string;
      wifi_site_count: string;
      vacant_count: string;
      avg_blight: string;
      violation_count: string;
      double_burden_score: string;
    }>(`
      SELECT
        ct.geoid,
        ct.name,
        ct.risk_score,
        ct.risk_tier,
        ct.pct_no_internet,
        ct.median_income,
        ct.pct_minority,
        ct.wifi_site_count,
        COUNT(DISTINCT vb.id)          AS vacant_count,
        COALESCE(AVG(vb.blight_score), 0) AS avg_blight,
        COUNT(DISTINCT v.id)           AS violation_count,
        ROUND(
          (COALESCE(ct.risk_score, 0) + COALESCE(AVG(vb.blight_score), 0)) / 2.0
        )                              AS double_burden_score
      FROM connectivity_tracts ct
      LEFT JOIN vacant_buildings vb
        ON vb.lat IS NOT NULL AND vb.lng IS NOT NULL
        AND vb.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND vb.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      LEFT JOIN violations v
        ON v.lat IS NOT NULL AND v.lng IS NOT NULL
        AND v.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND v.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      WHERE ct.risk_score >= 55
        AND ct.centroid_lat IS NOT NULL
        AND ct.centroid_lng IS NOT NULL
      GROUP BY
        ct.geoid, ct.name, ct.risk_score, ct.risk_tier,
        ct.pct_no_internet, ct.median_income, ct.pct_minority, ct.wifi_site_count
      HAVING COUNT(DISTINCT vb.id) > 0
      ORDER BY double_burden_score DESC NULLS LAST
      LIMIT 6
    `);

    // Overall correlation stats
    const stats = await query<{
      total_high_risk: string;
      with_blight: string;
      avg_blight_in_high_risk: string;
      avg_income_high_risk: string;
    }>(`
      SELECT
        COUNT(DISTINCT ct.geoid)                   AS total_high_risk,
        COUNT(DISTINCT CASE WHEN vb.id IS NOT NULL THEN ct.geoid END) AS with_blight,
        ROUND(AVG(vb.blight_score))                AS avg_blight_in_high_risk,
        ROUND(AVG(ct.median_income))               AS avg_income_high_risk
      FROM connectivity_tracts ct
      LEFT JOIN vacant_buildings vb
        ON vb.lat IS NOT NULL AND vb.lng IS NOT NULL
        AND vb.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND vb.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      WHERE ct.risk_score >= 55
        AND ct.centroid_lat IS NOT NULL
        AND ct.centroid_lng IS NOT NULL
    `);

    return Response.json({
      double_burden: doubleBurden,
      stats: stats[0] ?? null,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
