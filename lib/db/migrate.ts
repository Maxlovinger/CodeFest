import { transaction } from './index';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vacant_buildings (
  id SERIAL PRIMARY KEY,
  parcel_id TEXT UNIQUE,
  address TEXT,
  owner TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  market_value NUMERIC,
  total_area NUMERIC,
  category TEXT,
  zip_code TEXT,
  blight_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vacant_land (
  id SERIAL PRIMARY KEY,
  parcel_id TEXT UNIQUE,
  address TEXT,
  owner TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  total_area NUMERIC,
  zip_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  violation_id TEXT UNIQUE,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  violation_type TEXT,
  violation_date TIMESTAMPTZ,
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evictions (
  id SERIAL PRIMARY KEY,
  case_id TEXT UNIQUE,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  filing_date TIMESTAMPTZ,
  judgment TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS neighborhoods (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE,
  geojson JSONB,
  vacant_count INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  eviction_count INTEGER DEFAULT 0,
  avg_blight_score NUMERIC DEFAULT 0,
  risk_tier TEXT DEFAULT 'low',
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_log (
  id SERIAL PRIMARY KEY,
  source TEXT,
  records_ingested INTEGER,
  status TEXT,
  error TEXT,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_queries (
  id SERIAL PRIMARY KEY,
  query_type TEXT,
  user_message TEXT,
  neighborhood TEXT,
  parcel_id TEXT,
  response_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connectivity_tracts (
  id SERIAL PRIMARY KEY,
  geoid TEXT UNIQUE,
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
  wifi_site_count INTEGER DEFAULT 0,
  avg_site_speed_mbps NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  risk_tier TEXT DEFAULT 'low',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wifi_sites (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
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
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  source TEXT,
  event_timestamp TIMESTAMPTZ,
  request_id TEXT,
  api_key TEXT,
  agent_id TEXT,
  mode TEXT,
  event_type TEXT,
  severity TEXT,
  action TEXT,
  policy_trigger TEXT,
  reason TEXT,
  proposed_action TEXT,
  corrected_action TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vb_latlong ON vacant_buildings(lat, lng);
CREATE INDEX IF NOT EXISTS idx_vl_latlong ON vacant_land(lat, lng);
CREATE INDEX IF NOT EXISTS idx_viol_latlong ON violations(lat, lng);
CREATE INDEX IF NOT EXISTS idx_evict_latlong ON evictions(lat, lng);
CREATE INDEX IF NOT EXISTS idx_vb_blight ON vacant_buildings(blight_score DESC);
CREATE INDEX IF NOT EXISTS idx_connectivity_tracts_risk ON connectivity_tracts(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_wifi_sites_tract ON wifi_sites(census_tract_id);
CREATE INDEX IF NOT EXISTS idx_wifi_sites_latlng ON wifi_sites(lat, lng);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
`;

let migrated = false;
let migrationPromise: Promise<void> | null = null;

export async function migrate(): Promise<void> {
  if (migrated) return;
  if (migrationPromise) {
    await migrationPromise;
    return;
  }

  migrationPromise = (async () => {
    try {
      // Apply the schema in a single Neon transaction/fetch so refresh endpoints
      // stay under Cloudflare's Worker subrequest budget on cold isolates.
      const statements = SCHEMA.split(';').map(statement => statement.trim()).filter(Boolean);
      await transaction(statements);
      migrated = true;
      console.log('[migrate] Schema applied successfully');
    } catch (err) {
      console.error('[migrate] Error applying schema:', err);
      throw err;
    } finally {
      migrationPromise = null;
    }
  })();

  await migrationPromise;
}
