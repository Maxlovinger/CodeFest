import { query } from './db';

// Use outFields=* so the query never fails due to renamed/versioned field names.
// resultRecordCount=5000 ensures we get all Philly tracts in one request.
const TRACTS_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/tl_2021_42_tract_fiber_acs/FeatureServer/0/query?where=COUNTYFP%3D%27101%27&outFields=*&returnGeometry=true&resultRecordCount=5000&f=geojson';

const WIFI_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/free_city_wifi_locations/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&resultRecordCount=5000&f=geojson';

interface FeatureCollection {
  features?: Array<{
    geometry?: { type: string; coordinates?: unknown };
    properties?: Record<string, unknown>;
  }>;
}

interface WifiRow {
  external_id: string;
  site_name: string;
  street_address: string;
  zip: string;
  council_district: string;
  census_tract_id: string;
  program_type: string;
  public_wifi_available: string;
  current_internet_speed: string;
  speed_down_mbps: number;
  speed_up_mbps: number;
  pct_hh_no_internet: number;
  pct_hh_broadband: number;
  lat: number | null;
  lng: number | null;
  raw_json: Record<string, unknown>;
}

interface TractRow {
  geoid: string;
  name: string;
  geojson: Record<string, unknown>;
  centroid_lat: number;
  centroid_lng: number;
  pct_broadband: number;
  pct_no_internet: number;
  pct_no_devices: number;
  pct_minority: number;
  median_income: number;
  population: number;
  wifi_site_count: number;
  avg_site_speed_mbps: number;
  risk_score: number;
  risk_tier: string;
}

const INSERT_BATCH_SIZE = 200;

function parseNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

// Resolve a field that may carry different year suffixes (_23, _22, _21) or no suffix.
function resolveField(props: Record<string, unknown>, base: string, suffixes = ['_23', '_22', '_21', '']): unknown {
  for (const s of suffixes) {
    const v = props[`${base}${s}`];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function parseSpeed(speed: string | undefined): { down: number; up: number } {
  if (!speed) return { down: 0, up: 0 };
  const [down, up] = speed.split('/').map(v => parseNumber(v));
  return { down, up };
}

function computeRisk(params: {
  pctNoInternet: number;
  pctNoDevices: number;
  pctBroadband: number;
  pctMinority: number;
  medianIncome: number;
  wifiSiteCount: number;
  avgSpeed: number;
}): number {
  const incomePenalty = params.medianIncome > 0 ? Math.max(0, 1 - params.medianIncome / 90000) * 18 : 10;
  const wifiRelief = Math.min(params.wifiSiteCount * 2.5, 12);
  const speedRelief = Math.min(params.avgSpeed / 150, 1) * 8;

  const raw =
    params.pctNoInternet * 2.3 +
    params.pctNoDevices * 1.6 +
    Math.max(0, 75 - params.pctBroadband) * 0.8 +
    params.pctMinority * 0.25 +
    incomePenalty -
    wifiRelief -
    speedRelief;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

function riskTier(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

async function insertWifiBatch(rows: WifiRow[]): Promise<void> {
  if (!rows.length) return;
  await query(
    `INSERT INTO wifi_sites (
      external_id, site_name, street_address, zip, council_district, census_tract_id,
      program_type, public_wifi_available, current_internet_speed, speed_down_mbps, speed_up_mbps,
      pct_hh_no_internet, pct_hh_broadband, lat, lng, raw_json, updated_at
    )
    SELECT
      external_id, site_name, street_address, zip, council_district, census_tract_id,
      program_type, public_wifi_available, current_internet_speed, speed_down_mbps, speed_up_mbps,
      pct_hh_no_internet, pct_hh_broadband, lat, lng, raw_json, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS x(
      external_id TEXT,
      site_name TEXT,
      street_address TEXT,
      zip TEXT,
      council_district TEXT,
      census_tract_id TEXT,
      program_type TEXT,
      public_wifi_available TEXT,
      current_internet_speed TEXT,
      speed_down_mbps NUMERIC,
      speed_up_mbps NUMERIC,
      pct_hh_no_internet NUMERIC,
      pct_hh_broadband NUMERIC,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      raw_json JSONB
    )`,
    [JSON.stringify(rows)]
  );
}

async function insertTractBatch(rows: TractRow[]): Promise<void> {
  if (!rows.length) return;
  await query(
    `INSERT INTO connectivity_tracts (
      geoid, name, geojson, centroid_lat, centroid_lng, pct_broadband, pct_no_internet,
      pct_no_devices, pct_minority, median_income, population, wifi_site_count,
      avg_site_speed_mbps, risk_score, risk_tier, updated_at
    )
    SELECT
      geoid, name, geojson, centroid_lat, centroid_lng, pct_broadband, pct_no_internet,
      pct_no_devices, pct_minority, median_income, population, wifi_site_count,
      avg_site_speed_mbps, risk_score, risk_tier, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS x(
      geoid TEXT,
      name TEXT,
      geojson JSONB,
      centroid_lat DOUBLE PRECISION,
      centroid_lng DOUBLE PRECISION,
      pct_broadband NUMERIC,
      pct_no_internet NUMERIC,
      pct_no_devices NUMERIC,
      pct_minority NUMERIC,
      median_income NUMERIC,
      population INTEGER,
      wifi_site_count INTEGER,
      avg_site_speed_mbps NUMERIC,
      risk_score NUMERIC,
      risk_tier TEXT
    )`,
    [JSON.stringify(rows)]
  );
}

async function computeAndStoreEquity(): Promise<void> {
  // Double-burden areas: high connectivity risk + nearby housing blight
  const patterns = await query<{
    geoid: string; name: string; risk_score: string; risk_tier: string;
    pct_no_internet: string; median_income: string; pct_minority: string;
    wifi_site_count: string; vacant_count: string; avg_blight: string;
    violation_count: string; double_burden_score: string;
  }>(`
    SELECT
      ct.geoid, ct.name, ct.risk_score, ct.risk_tier,
      ct.pct_no_internet, ct.median_income, ct.pct_minority, ct.wifi_site_count,
      COUNT(DISTINCT vb.id)                AS vacant_count,
      COALESCE(AVG(vb.blight_score), 0)    AS avg_blight,
      COUNT(DISTINCT v.id)                 AS violation_count,
      ROUND((COALESCE(ct.risk_score,0) + COALESCE(AVG(vb.blight_score),0)) / 2.0) AS double_burden_score
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
      AND ct.centroid_lat IS NOT NULL AND ct.centroid_lng IS NOT NULL
    GROUP BY ct.geoid, ct.name, ct.risk_score, ct.risk_tier,
             ct.pct_no_internet, ct.median_income, ct.pct_minority, ct.wifi_site_count
    HAVING COUNT(DISTINCT vb.id) > 0
    ORDER BY double_burden_score DESC NULLS LAST
    LIMIT 6
  `);

  const statsRows = await query<{
    total_high_risk: string; with_blight: string;
    avg_blight_in_high_risk: string; avg_income_high_risk: string;
  }>(`
    SELECT
      COUNT(DISTINCT ct.geoid) AS total_high_risk,
      COUNT(DISTINCT CASE WHEN vb.id IS NOT NULL THEN ct.geoid END) AS with_blight,
      ROUND(AVG(vb.blight_score))  AS avg_blight_in_high_risk,
      ROUND(AVG(ct.median_income)) AS avg_income_high_risk
    FROM connectivity_tracts ct
    LEFT JOIN vacant_buildings vb
      ON vb.lat IS NOT NULL AND vb.lng IS NOT NULL
      AND vb.lat BETWEEN ct.centroid_lat - 0.012 AND ct.centroid_lat + 0.012
      AND vb.lng BETWEEN ct.centroid_lng - 0.012 AND ct.centroid_lng + 0.012
    WHERE ct.risk_score >= 55
      AND ct.centroid_lat IS NOT NULL AND ct.centroid_lng IS NOT NULL
  `);

  await query('DELETE FROM equity_patterns');
  await query('DELETE FROM equity_stats');

  if (patterns.length > 0) {
    await query(
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
      [JSON.stringify(patterns)]
    );
  }

  if (statsRows[0]) {
    const s = statsRows[0];
    await query(
      `INSERT INTO equity_stats (total_high_risk, with_blight, avg_blight_in_high_risk, avg_income_high_risk)
       VALUES ($1, $2, $3, $4)`,
      [s.total_high_risk, s.with_blight, s.avg_blight_in_high_risk, s.avg_income_high_risk]
    );
  }
}

export async function ingestConnectivityData(): Promise<{
  tracts: number;
  wifiSites: number;
}> {
  const [tractRes, wifiRes] = await Promise.all([
    fetch(TRACTS_URL, { headers: { Accept: 'application/json' } }),
    fetch(WIFI_URL, { headers: { Accept: 'application/json' } }),
  ]);

  if (!tractRes.ok) throw new Error(`Connectivity tract fetch failed: ${tractRes.status}`);
  if (!wifiRes.ok) throw new Error(`Connectivity wifi fetch failed: ${wifiRes.status}`);

  const tractJson = (await tractRes.json()) as FeatureCollection;
  const wifiJson = (await wifiRes.json()) as FeatureCollection;

  const wifiFeatures = wifiJson.features ?? [];
  const wifiRows: WifiRow[] = [];
  const tractRows: TractRow[] = [];

  await query('DELETE FROM wifi_sites;');
  await query('DELETE FROM connectivity_tracts;');

  const wifiByTract = new Map<string, { count: number; totalSpeed: number }>();

  for (const feature of wifiFeatures) {
    const props = feature.properties ?? {};
    const coords = Array.isArray(feature.geometry?.coordinates) ? feature.geometry?.coordinates as number[] : [];
    const tractId = String(props.census_tract_id ?? '').replace('1400000US', '');
    const speed = String(props.current_internet_speed_mbps ?? '');
    const parsedSpeed = parseSpeed(speed);
    const externalId = `${String(props.site_name ?? 'site')}|${String(props.street_address ?? '')}`;

    wifiRows.push({
      external_id: externalId,
      site_name: String(props.site_name ?? ''),
      street_address: String(props.street_address ?? ''),
      zip: String(props.zip ?? ''),
      council_district: String(props.council_district ?? ''),
      census_tract_id: tractId,
      program_type: String(props.program_type_to_display ?? ''),
      public_wifi_available: String(props.public_wifi_available ?? ''),
      current_internet_speed: speed,
      speed_down_mbps: parsedSpeed.down,
      speed_up_mbps: parsedSpeed.up,
      pct_hh_no_internet: parseNumber(resolveField(props, 'pct_hh_no_internet')),
      pct_hh_broadband: parseNumber(resolveField(props, 'pct_hh_bband_fiber_dsl_cable')),
      lat: coords[1] ?? null,
      lng: coords[0] ?? null,
      raw_json: props,
    });

    if (tractId) {
      const agg = wifiByTract.get(tractId) ?? { count: 0, totalSpeed: 0 };
      agg.count += 1;
      agg.totalSpeed += parsedSpeed.down;
      wifiByTract.set(tractId, agg);
    }
  }

  for (let i = 0; i < wifiRows.length; i += INSERT_BATCH_SIZE) {
    await insertWifiBatch(wifiRows.slice(i, i + INSERT_BATCH_SIZE));
  }

  const tractFeatures = tractJson.features ?? [];

  for (const feature of tractFeatures) {
    const props = feature.properties ?? {};
    const geoid = String(props.GEOID ?? '');
    const wifiAgg = wifiByTract.get(geoid) ?? { count: 0, totalSpeed: 0 };
    const avgSpeed = wifiAgg.count > 0 ? wifiAgg.totalSpeed / wifiAgg.count : 0;
    const broadband = parseNumber(resolveField(props, 'pct_hh_bband_fiber_dsl_cable'));
    const noInternet = parseNumber(resolveField(props, 'pct_hh_no_internet'));
    const noDevices = parseNumber(resolveField(props, 'pct_hh_no_devices'));
    const minority = parseNumber(resolveField(props, 'pct_minority_racial_ethnic'));
    const income = parseNumber(resolveField(props, 'median_hh_income'));
    const population = Math.round(parseNumber(resolveField(props, 'total_population')));
    const score = computeRisk({
      pctNoInternet: noInternet,
      pctNoDevices: noDevices,
      pctBroadband: broadband,
      pctMinority: minority,
      medianIncome: income,
      wifiSiteCount: wifiAgg.count,
      avgSpeed,
    });

    tractRows.push({
      geoid,
      name: String(props.NAME ?? geoid),
      geojson: {
        type: 'Feature',
        geometry: feature.geometry,
        properties: props,
      },
      centroid_lat: parseNumber(props.INTPTLAT),
      centroid_lng: parseNumber(props.INTPTLON),
      pct_broadband: broadband,
      pct_no_internet: noInternet,
      pct_no_devices: noDevices,
      pct_minority: minority,
      median_income: income,
      population,
      wifi_site_count: wifiAgg.count,
      avg_site_speed_mbps: avgSpeed,
      risk_score: score,
      risk_tier: riskTier(score),
    });
  }

  for (let i = 0; i < tractRows.length; i += INSERT_BATCH_SIZE) {
    await insertTractBatch(tractRows.slice(i, i + INSERT_BATCH_SIZE));
  }

  const wifiSiteCount = wifiRows.length;
  const tractCount = tractRows.length;

  await query(
    `INSERT INTO ingestion_log (source, records_ingested, status)
     VALUES ($1, $2, $3), ($4, $5, $6)`,
    ['connectivity_tracts', tractCount, 'success', 'wifi_sites', wifiSiteCount, 'success']
  );

  // Equity pre-computation is handled lazily by /api/signal/equity on first read.
  // Removed from here to keep ingest under Cloudflare's 30s wall-clock limit.

  return { tracts: tractCount, wifiSites: wifiSiteCount };
}
