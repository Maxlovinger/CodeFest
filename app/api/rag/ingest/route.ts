import { NextRequest } from 'next/server';
import { query } from '@/lib/db/index';
import { ensureIndex, embedTexts, getIndex } from '@/lib/pinecone';

const BATCH = 48; // Pinecone inference batch limit

function blightTier(score: number) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

// Chunk all the data sources into text + metadata records
async function buildChunks() {
  const chunks: { id: string; text: string; metadata: Record<string, string | number> }[] = [];

  // ── 1. TOP PROPERTIES BY BLIGHT SCORE ──────────────────────────────────
  try {
    const props = await query<{
      id: number; address: string; owner: string; zip_code: string;
      blight_score: number; market_value: number; total_area: number;
      category: string;
    }>(`
      SELECT id, address, COALESCE(owner,'Unknown') as owner,
             COALESCE(zip_code,'') as zip_code,
             COALESCE(blight_score,0) as blight_score,
             COALESCE(market_value,0) as market_value,
             COALESCE(total_area,0) as total_area,
             COALESCE(category,'Vacant') as category
      FROM vacant_buildings
      ORDER BY blight_score DESC
      LIMIT 800
    `);

    for (const p of props) {
      const score = Number(p.blight_score) || 0;
      const text = [
        `Vacant property at ${p.address}${p.zip_code ? ` (ZIP ${p.zip_code})` : ''}, owned by ${p.owner}.`,
        `Blight Score: ${score}/100 — ${blightTier(score)} risk.`,
        p.market_value ? `Assessed market value: $${Math.round(Number(p.market_value)).toLocaleString()}.` : '',
        p.total_area ? `Parcel area: ${Math.round(Number(p.total_area)).toLocaleString()} sq ft.` : '',
        `Category: ${p.category}.`,
      ].filter(Boolean).join(' ');

      chunks.push({
        id: `prop-${p.id}`,
        text,
        metadata: {
          type: 'property',
          address: p.address,
          zip_code: p.zip_code || '',
          blight_score: score,
          tier: blightTier(score),
          text,
        },
      });
    }
  } catch (e) { console.warn('[RAG] property ingest error:', e); }

  // ── 2. VIOLATION SUMMARIES BY ZIP + TYPE ───────────────────────────────
  try {
    const viols = await query<{
      zip_code: string; violation_type: string; cnt: string;
    }>(`
      SELECT COALESCE(zip_code,'unknown') as zip_code,
             violation_type,
             COUNT(*) as cnt
      FROM violations
      WHERE violation_type IS NOT NULL
      GROUP BY zip_code, violation_type
      HAVING COUNT(*) > 2
      ORDER BY cnt DESC
      LIMIT 400
    `);

    for (const v of viols) {
      const text = `${v.violation_type} violations in Philadelphia ZIP ${v.zip_code}: ${v.cnt} active cases recorded.`;
      chunks.push({
        id: `viol-${v.zip_code}-${v.violation_type.slice(0, 20).replace(/\s/g, '_')}`,
        text,
        metadata: { type: 'violation', zip_code: v.zip_code, violation_type: v.violation_type, count: Number(v.cnt), text },
      });
    }
  } catch (e) { console.warn('[RAG] violation ingest error:', e); }

  // ── 3. EVICTION SUMMARIES BY ZIP ───────────────────────────────────────
  try {
    const evicts = await query<{
      zip_code: string; cnt: string; avg_amount: string;
    }>(`
      SELECT COALESCE(zip_code,'unknown') as zip_code,
             COUNT(*) as cnt,
             AVG(COALESCE(amount,0)) as avg_amount
      FROM evictions
      GROUP BY zip_code
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 100
    `);

    for (const e of evicts) {
      const avg = Math.round(parseFloat(e.avg_amount || '0'));
      const text = `Eviction filings in Philadelphia ZIP ${e.zip_code}: ${e.cnt} cases. Average judgment amount: $${avg.toLocaleString()}.`;
      chunks.push({
        id: `evict-${e.zip_code}`,
        text,
        metadata: { type: 'eviction', zip_code: e.zip_code, count: Number(e.cnt), avg_amount: avg, text },
      });
    }
  } catch (e) { console.warn('[RAG] eviction ingest error:', e); }

  // ── 4. NEIGHBORHOOD AGGREGATES ─────────────────────────────────────────
  try {
    const hoods = await query<{
      neighborhood: string; prop_count: string; avg_blight: string;
      critical_count: string; viol_count: string;
    }>(`
      SELECT
        COALESCE(category, 'Unknown') as neighborhood,
        COUNT(*) as prop_count,
        AVG(blight_score) as avg_blight,
        SUM(CASE WHEN blight_score >= 80 THEN 1 ELSE 0 END) as critical_count,
        (SELECT COUNT(*) FROM violations WHERE violations.address ILIKE '%' || vacant_buildings.category || '%') as viol_count
      FROM vacant_buildings
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY avg_blight DESC
      LIMIT 200
    `);

    for (const h of hoods) {
      const avg = Math.round(parseFloat(h.avg_blight || '0'));
      const text = [
        `Philadelphia area "${h.neighborhood}":`,
        `${h.prop_count} vacant/blighted properties tracked.`,
        `Average blight score: ${avg}/100.`,
        `Critical-risk properties (80+): ${h.critical_count}.`,
        h.viol_count && Number(h.viol_count) > 0 ? `Code violations in area: ${h.viol_count}.` : '',
      ].filter(Boolean).join(' ');

      chunks.push({
        id: `hood-${h.neighborhood.slice(0, 40).replace(/\s/g, '_')}`,
        text,
        metadata: {
          type: 'neighborhood',
          neighborhood: h.neighborhood,
          prop_count: Number(h.prop_count),
          avg_blight: avg,
          critical_count: Number(h.critical_count),
          text,
        },
      });
    }
  } catch (e) { console.warn('[RAG] neighborhood ingest error:', e); }

  // ── 5. CITY-WIDE STATS SUMMARY ─────────────────────────────────────────
  try {
    const [vbRow, violRow, evRow] = await Promise.all([
      query<{ total: string; avg_blight: string; critical: string; high: string }>(
        `SELECT COUNT(*) as total,
                AVG(blight_score) as avg_blight,
                SUM(CASE WHEN blight_score >= 80 THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN blight_score >= 60 THEN 1 ELSE 0 END) as high
         FROM vacant_buildings`
      ),
      query<{ total: string; structural: string; electrical: string; sanitation: string }>(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN violation_type ILIKE '%struct%' OR violation_type ILIKE '%exterior%' THEN 1 ELSE 0 END) as structural,
                SUM(CASE WHEN violation_type ILIKE '%electr%' THEN 1 ELSE 0 END) as electrical,
                SUM(CASE WHEN violation_type ILIKE '%sanit%' OR violation_type ILIKE '%rodent%' THEN 1 ELSE 0 END) as sanitation
         FROM violations`
      ),
      query<{ total: string; avg_amount: string }>(
        `SELECT COUNT(*) as total, AVG(COALESCE(amount,0)) as avg_amount FROM evictions`
      ),
    ]);

    const vb = vbRow[0] || {};
    const vi = violRow[0] || {};
    const ev = evRow[0] || {};
    const text = [
      `Philadelphia housing crisis city-wide summary as of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
      `Total vacant/blighted properties tracked: ${vb.total || 0}.`,
      `Average blight score across all properties: ${Math.round(parseFloat(vb.avg_blight || '0'))}/100.`,
      `Critical-risk properties (score 80+): ${vb.critical || 0}. High-risk (60+): ${vb.high || 0}.`,
      `Total L&I code violations: ${vi.total || 0} (structural: ${vi.structural || 0}, electrical: ${vi.electrical || 0}, sanitation: ${vi.sanitation || 0}).`,
      `Total eviction filings: ${ev.total || 0}. Average judgment amount: $${Math.round(parseFloat(ev.avg_amount || '0')).toLocaleString()}.`,
    ].join(' ');

    chunks.push({
      id: 'city-summary',
      text,
      metadata: { type: 'city_summary', text },
    });
  } catch (e) { console.warn('[RAG] city stats error:', e); }

  return chunks;
}

export async function POST(_req: NextRequest) {
  try {
    // Ensure the Pinecone index exists
    await ensureIndex();

    const chunks = await buildChunks();
    if (chunks.length === 0) {
      return Response.json({ error: 'No data to ingest' }, { status: 400 });
    }

    const index = getIndex();
    let upserted = 0;

    // Embed + upsert in batches
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const texts = batch.map(c => c.text);

      let vectors: number[][];
      try {
        vectors = await embedTexts(texts);
      } catch (e) {
        console.warn(`[RAG] embed batch ${i}–${i + BATCH} failed:`, e);
        continue;
      }

      const records = batch.map((c, j) => ({
        id: c.id,
        values: vectors[j],
        metadata: c.metadata,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (index as any).upsert({ records });
      upserted += records.length;
    }

    return Response.json({
      ok: true,
      total_chunks: chunks.length,
      upserted,
      message: `RAG index populated: ${upserted} vectors ingested from ${chunks.length} data chunks.`,
    });
  } catch (err) {
    console.error('[RAG] ingest error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// Also allow GET for easy browser testing
export async function GET(req: NextRequest) {
  return POST(req);
}
