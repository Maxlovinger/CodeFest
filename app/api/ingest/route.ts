import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

// Build Carto SQL URL - use JSON format for row-based queries, GeoJSON for geo sources
function cartoJsonUrl(sql: string): string {
  return `https://phl.carto.com/api/v2/sql?q=${encodeURIComponent(sql)}&format=json`;
}

function cartoGeoUrl(sql: string): string {
  // Use + encoding for spaces to avoid issues with some Carto endpoints
  return `https://phl.carto.com/api/v2/sql?q=${sql.replace(/ /g, '+')}&format=GeoJSON`;
}

const SOURCES = [
  {
    name: 'vacant_buildings',
    label: 'Vacant Buildings (OPA)',
    url: cartoJsonUrl(
      `SELECT parcel_number, location, zip_code, owner_1, market_value, total_area, category_code_description, exterior_condition, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM opa_properties_public WHERE exterior_condition IN ('6','7') AND the_geom IS NOT NULL LIMIT 3000`
    ),
    format: 'json' as const,
  },
  {
    name: 'blighted_properties',
    label: 'Blighted Properties',
    url: cartoJsonUrl(
      `SELECT parcel_number, location, zip_code, owner_1, market_value, total_area, category_code_description, exterior_condition, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM opa_properties_public WHERE exterior_condition = '5' AND market_value < 50000 AND the_geom IS NOT NULL LIMIT 3000`
    ),
    format: 'json' as const,
  },
  {
    name: 'low_value_properties',
    label: 'Low-Value Properties',
    url: cartoJsonUrl(
      `SELECT parcel_number, location, zip_code, owner_1, market_value, total_area, category_code_description, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM opa_properties_public WHERE market_value IS NOT NULL AND market_value > 0 AND the_geom IS NOT NULL ORDER BY market_value ASC LIMIT 3000`
    ),
    format: 'json' as const,
  },
  {
    name: 'violations',
    label: 'L&I Violations',
    url: cartoJsonUrl(
      `SELECT cartodb_id, address, violationdate, violationtype, violationdescription, casestatus, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lng FROM violations WHERE violationdate > NOW() - INTERVAL '2 years' AND the_geom IS NOT NULL LIMIT 5000`
    ),
    format: 'json' as const,
  },
  {
    name: 'neighborhoods',
    label: 'Neighborhood Boundaries',
    url: 'https://raw.githubusercontent.com/opendataphilly/open-geo-data/master/philadelphia-neighborhoods/philadelphia-neighborhoods.geojson',
    format: 'geojson' as const,
  },
];

async function fetchData(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url.substring(0, 80)}`);
  return res.json();
}

// Extract rows from either GeoJSON or Carto JSON format
function extractRows(data: Record<string, unknown>): Record<string, unknown>[] {
  if (data.features) {
    // GeoJSON format - flatten properties
    return (data.features as Record<string, unknown>[]).map(f => ({
      ...(f.properties as Record<string, unknown>),
      _lat: ((f.geometry as Record<string, unknown>)?.coordinates as number[])?.[1],
      _lng: ((f.geometry as Record<string, unknown>)?.coordinates as number[])?.[0],
    }));
  }
  if (data.rows) {
    // Carto JSON format
    return data.rows as Record<string, unknown>[];
  }
  return [];
}

async function ingestVacantBuildings(data: Record<string, unknown>): Promise<number> {
  const rows = extractRows(data);
  let count = 0;
  for (const props of rows) {
    const lat = parseFloat(String(props.lat || props._lat || '0'));
    const lng = parseFloat(String(props.lng || props._lng || '0'));
    if (!lat || !lng || Math.abs(lat) < 0.1 || Math.abs(lng) < 0.1) continue;
    const parcelId = String(props.parcel_number || `vb-${lat.toFixed(6)}-${lng.toFixed(6)}`);
    const address = String(props.location || props.address || '');
    const owner = String(props.owner_1 || props.owner || '');
    const zip = String(props.zip_code || '');
    const marketValue = parseFloat(String(props.market_value || '0')) || null;
    const totalArea = parseFloat(String(props.total_area || '0')) || null;
    const category = String(props.category_code_description || props.exterior_condition || '');
    try {
      await query(
        `INSERT INTO vacant_buildings (parcel_id, address, owner, lat, lng, market_value, total_area, category, zip_code, blight_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (parcel_id) DO UPDATE SET address=EXCLUDED.address, owner=EXCLUDED.owner, lat=EXCLUDED.lat, lng=EXCLUDED.lng, market_value=EXCLUDED.market_value, category=EXCLUDED.category, updated_at=NOW()`,
        [parcelId, address, owner, lat, lng, marketValue, totalArea, category, zip, 50]
      );
      count++;
    } catch { /* skip duplicates */ }
  }
  return count;
}

async function ingestViolations(data: Record<string, unknown>): Promise<number> {
  const rows = extractRows(data);
  let count = 0;
  for (const props of rows) {
    const lat = parseFloat(String(props.lat || props._lat || '0'));
    const lng = parseFloat(String(props.lng || props._lng || '0'));
    if (!lat || !lng || Math.abs(lat) < 0.1 || Math.abs(lng) < 0.1) continue;

    const violId = String(props.cartodb_id || props.casenumber || `v-${lat.toFixed(5)}-${lng.toFixed(5)}`);
    const address = String(props.address || '');
    const type = String(props.violationtype || props.violationdescription || props.casetype || 'other');
    const status = String(props.casestatus || props.status || '');
    const description = String(props.violationdescription || '');
    const dateStr = String(props.violationdate || props.caseaddeddate || '');
    const violDate = dateStr ? new Date(dateStr) : null;
    const violDateValid = violDate && !isNaN(violDate.getTime()) ? violDate.toISOString() : null;
    try {
      await query(
        `INSERT INTO violations (violation_id, address, lat, lng, violation_type, violation_date, status, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (violation_id) DO NOTHING`,
        [violId, address, lat, lng, type, violDateValid, status, description]
      );
      count++;
    } catch { /* skip duplicates */ }
  }
  return count;
}

async function ingestNeighborhoods(data: Record<string, unknown>): Promise<number> {
  const features = (data.features as Record<string, unknown>[]) || [];
  let count = 0;
  for (const f of features) {
    const props = f.properties as Record<string, unknown>;
    const name = String(props.NAME || props.MAPNAME || props.name || '');
    if (!name) continue;
    try {
      await query(
        `INSERT INTO neighborhoods (name, geojson)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET geojson=EXCLUDED.geojson, updated_at=NOW()`,
        [name, JSON.stringify(f)]
      );
      count++;
    } catch { /* skip */ }
  }
  return count;
}

async function computeBlightScores(): Promise<void> {
  const vals = await query<{ market_value: string }>(
    `SELECT market_value FROM vacant_buildings WHERE market_value IS NOT NULL AND market_value > 0 ORDER BY market_value ASC`
  );
  const total = vals.length;
  if (total === 0) return;

  const p10 = parseFloat(String(vals[Math.floor(total * 0.10)]?.market_value)) || 0;
  const p25 = parseFloat(String(vals[Math.floor(total * 0.25)]?.market_value)) || 0;
  const p50 = parseFloat(String(vals[Math.floor(total * 0.50)]?.market_value)) || 0;

  await query(`
    UPDATE vacant_buildings vb
    SET blight_score = LEAST(100, (
      COALESCE((
        SELECT LEAST(40, COUNT(*) * 10)
        FROM violations v
        WHERE v.address = vb.address
        AND v.violation_date > NOW() - INTERVAL '2 years'
      ), 0)
      +
      CASE
        WHEN vb.market_value IS NULL THEN 15
        WHEN vb.market_value <= $1 THEN 30
        WHEN vb.market_value <= $2 THEN 20
        WHEN vb.market_value <= $3 THEN 10
        ELSE 0
      END
      +
      30
    ))
  `, [p10, p25, p50]);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';

  try {
    await migrate();
  } catch (err) {
    return Response.json({ error: 'Migration failed', details: String(err) }, { status: 500 });
  }

  // Check if already ingested today
  if (!force) {
    const recent = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ingestion_log WHERE ingested_at > NOW() - INTERVAL '24 hours' AND status = 'success'`
    );
    if (parseInt(recent[0]?.count || '0') > 0) {
      const stats = await query<{ vacant_buildings: string; violations: string }>(
        `SELECT (SELECT COUNT(*) FROM vacant_buildings) as vacant_buildings,
                (SELECT COUNT(*) FROM violations) as violations`
      );
      return Response.json({ status: 'already_ingested', stats: stats[0] });
    }
  }

  const results: Record<string, unknown> = {};

  for (const source of SOURCES) {
    try {
      const data = await fetchData(source.url);
      let count = 0;
      switch (source.name) {
        case 'vacant_buildings':
        case 'blighted_properties':
        case 'low_value_properties':
          count = await ingestVacantBuildings(data);
          break;
        case 'violations':
          count = await ingestViolations(data);
          break;
        case 'neighborhoods':
          count = await ingestNeighborhoods(data);
          break;
      }
      await query(
        `INSERT INTO ingestion_log (source, records_ingested, status) VALUES ($1, $2, $3)`,
        [source.name, count, 'success']
      );
      results[source.name] = { count, status: 'success' };
    } catch (err) {
      const errMsg = String(err);
      await query(
        `INSERT INTO ingestion_log (source, records_ingested, status, error) VALUES ($1, $2, $3, $4)`,
        [source.name, 0, 'error', errMsg]
      );
      results[source.name] = { count: 0, status: 'error', error: errMsg };
    }
  }

  try {
    await computeBlightScores();
    results['blight_scores'] = { status: 'computed' };
  } catch (err) {
    results['blight_scores'] = { status: 'error', error: String(err) };
  }

  return Response.json({ status: 'complete', results });
}
