import { query } from '@/lib/db';

// Ensure equity tables exist without depending on the full migrate() chain
async function ensureEquityTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS equity_patterns (
      id SERIAL PRIMARY KEY,
      geoid TEXT UNIQUE,
      name TEXT,
      risk_score NUMERIC,
      risk_tier TEXT,
      pct_no_internet NUMERIC,
      median_income NUMERIC,
      pct_minority NUMERIC,
      wifi_site_count INTEGER,
      vacant_count INTEGER,
      avg_blight NUMERIC,
      violation_count INTEGER,
      double_burden_score NUMERIC,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS equity_stats (
      id SERIAL PRIMARY KEY,
      total_high_risk INTEGER,
      with_blight INTEGER,
      avg_blight_in_high_risk NUMERIC,
      avg_income_high_risk NUMERIC,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Fast fallback: compute directly from source tables when pre-computed data isn't ready
async function computeLive() {
  const [patterns, stats] = await Promise.all([
    query<{
      geoid: string; name: string; risk_score: string; risk_tier: string;
      pct_no_internet: string; median_income: string; pct_minority: string;
      wifi_site_count: string; vacant_count: string; avg_blight: string;
      violation_count: string; double_burden_score: string;
    }>(`
      SELECT
        ct.geoid, ct.name, ct.risk_score, ct.risk_tier,
        ct.pct_no_internet, ct.median_income, ct.pct_minority, ct.wifi_site_count,
        COUNT(DISTINCT vb.id)                                           AS vacant_count,
        COALESCE(AVG(vb.blight_score), 0)                              AS avg_blight,
        COUNT(DISTINCT v.id)                                            AS violation_count,
        ROUND((COALESCE(ct.risk_score,0) + COALESCE(AVG(vb.blight_score),0)) / 2.0) AS double_burden_score
      FROM connectivity_tracts ct
      LEFT JOIN vacant_buildings vb
        ON vb.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND vb.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      LEFT JOIN violations v
        ON v.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND v.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      WHERE ct.risk_score >= 55
        AND ct.centroid_lat IS NOT NULL AND ct.centroid_lng IS NOT NULL
      GROUP BY ct.geoid, ct.name, ct.risk_score, ct.risk_tier,
               ct.pct_no_internet, ct.median_income, ct.pct_minority, ct.wifi_site_count
      HAVING COUNT(DISTINCT vb.id) > 0
      ORDER BY double_burden_score DESC NULLS LAST
      LIMIT 6
    `),
    query<{
      total_high_risk: string; with_blight: string;
      avg_blight_in_high_risk: string; avg_income_high_risk: string;
    }>(`
      SELECT
        COUNT(DISTINCT ct.geoid)                                                         AS total_high_risk,
        COUNT(DISTINCT CASE WHEN vb.id IS NOT NULL THEN ct.geoid END)                   AS with_blight,
        ROUND(AVG(vb.blight_score))                                                      AS avg_blight_in_high_risk,
        ROUND(AVG(ct.median_income))                                                     AS avg_income_high_risk
      FROM connectivity_tracts ct
      LEFT JOIN vacant_buildings vb
        ON vb.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
        AND vb.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
      WHERE ct.risk_score >= 55
        AND ct.centroid_lat IS NOT NULL AND ct.centroid_lng IS NOT NULL
    `),
  ]);
  return { double_burden: patterns, stats: stats[0] ?? null };
}

export async function GET() {
  try {
    // Ensure tables exist first
    await ensureEquityTables();

    // Try pre-computed tables — fastest path
    const [patterns, stats] = await Promise.all([
      query<Record<string, string>>(`SELECT * FROM equity_patterns ORDER BY double_burden_score DESC LIMIT 6`),
      query<Record<string, string>>(`SELECT * FROM equity_stats ORDER BY updated_at DESC LIMIT 1`),
    ]);

    if (patterns.length > 0) {
      return Response.json({ double_burden: patterns, stats: stats[0] ?? null });
    }

    // Pre-computed tables empty — compute live and cache for next time
    const live = await computeLive();

    // Store results asynchronously so this request doesn't wait
    if (live.double_burden.length > 0) {
      Promise.all([
        query('DELETE FROM equity_patterns'),
        query('DELETE FROM equity_stats'),
      ]).then(() => Promise.all([
        live.double_burden.length > 0
          ? query(
              `INSERT INTO equity_patterns
                (geoid, name, risk_score, risk_tier, pct_no_internet, median_income, pct_minority,
                 wifi_site_count, vacant_count, avg_blight, violation_count, double_burden_score)
               SELECT geoid, name, risk_score, risk_tier, pct_no_internet, median_income, pct_minority,
                      wifi_site_count, vacant_count, avg_blight, violation_count, double_burden_score
               FROM jsonb_to_recordset($1::jsonb) AS x(
                 geoid TEXT, name TEXT, risk_score NUMERIC, risk_tier TEXT, pct_no_internet NUMERIC,
                 median_income NUMERIC, pct_minority NUMERIC, wifi_site_count INTEGER,
                 vacant_count INTEGER, avg_blight NUMERIC, violation_count INTEGER, double_burden_score NUMERIC
               )`,
              [JSON.stringify(live.double_burden)]
            )
          : Promise.resolve([]),
        live.stats
          ? query(
              `INSERT INTO equity_stats (total_high_risk, with_blight, avg_blight_in_high_risk, avg_income_high_risk)
               VALUES ($1, $2, $3, $4)`,
              [live.stats.total_high_risk, live.stats.with_blight, live.stats.avg_blight_in_high_risk, live.stats.avg_income_high_risk]
            )
          : Promise.resolve([]),
      ])).catch(() => {}); // fire and forget
    }

    return Response.json(live);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
