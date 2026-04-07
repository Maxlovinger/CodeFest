import { query } from './index';

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

CREATE INDEX IF NOT EXISTS idx_vb_latlong ON vacant_buildings(lat, lng);
CREATE INDEX IF NOT EXISTS idx_vl_latlong ON vacant_land(lat, lng);
CREATE INDEX IF NOT EXISTS idx_viol_latlong ON violations(lat, lng);
CREATE INDEX IF NOT EXISTS idx_evict_latlong ON evictions(lat, lng);
CREATE INDEX IF NOT EXISTS idx_vb_blight ON vacant_buildings(blight_score DESC);
`;

let migrated = false;

export async function migrate(): Promise<void> {
  if (migrated) return;
  try {
    // Run each statement individually
    const statements = SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await query(stmt + ';');
    }
    migrated = true;
    console.log('[migrate] Schema applied successfully');
  } catch (err) {
    console.error('[migrate] Error applying schema:', err);
    throw err;
  }
}
