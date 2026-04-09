import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { query } from '@/lib/db/index';
import { retrieveContext, formatRagContext } from '@/lib/rag';

// Ray-casting point-in-polygon (coordinates as [lng, lat])
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeometry(
  lng: number,
  lat: number,
  geom: { type: string; coordinates: number[][][] | number[][][][] }
): boolean {
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as number[][][];
    // Must be inside outer ring and outside all holes
    if (!pointInRing(lng, lat, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i])) return false;
    }
    return true;
  }
  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as number[][][][]) {
      if (!pointInRing(lng, lat, poly[0])) continue;
      let inHole = false;
      for (let i = 1; i < poly.length; i++) {
        if (pointInRing(lng, lat, poly[i])) { inHole = true; break; }
      }
      if (!inHole) return true;
    }
    return false;
  }
  return false;
}

function getBounds(geom: { type: string; coordinates: number[][][] | number[][][][] }) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const rings: number[][][] =
    geom.type === 'Polygon'
      ? (geom.coordinates as number[][][])
      : (geom.coordinates as number[][][][]).flat();
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

export async function POST(req: NextRequest) {
  try {
    const { neighborhood } = await req.json();

    if (!neighborhood) {
      return Response.json({ error: 'neighborhood required' }, { status: 400 });
    }

    // Fetch neighborhood geometry from DB
    const nbrRows = await query<{ name: string; geojson: { geometry: { type: string; coordinates: number[][][] | number[][][][] } } }>(
      `SELECT name, geojson FROM neighborhoods WHERE name = $1 LIMIT 1`,
      [neighborhood]
    ).catch(() => []);

    let stats = { vacant: 0, avgBlight: 0, violations: 0, critical: 0, high: 0 };

    if (nbrRows.length > 0) {
      const geom = nbrRows[0].geojson?.geometry;
      if (geom) {
        const { minLng, maxLng, minLat, maxLat } = getBounds(geom);

        // Bounding-box pre-filter, then PIP in JS
        const [propRows, violRows] = await Promise.all([
          query<{ lng: number; lat: number; blight_score: number }>(
            `SELECT lng, lat, blight_score FROM vacant_buildings
             WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4
             AND lat IS NOT NULL AND lng IS NOT NULL`,
            [minLat, maxLat, minLng, maxLng]
          ).catch(() => []),
          query<{ lng: number; lat: number }>(
            `SELECT lng, lat FROM violations
             WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4
             AND lat IS NOT NULL AND lng IS NOT NULL`,
            [minLat, maxLat, minLng, maxLng]
          ).catch(() => []),
        ]);

        const props = propRows.filter(p => pointInGeometry(Number(p.lng), Number(p.lat), geom));
        const viols = violRows.filter(v => pointInGeometry(Number(v.lng), Number(v.lat), geom));

        stats.vacant = props.length;
        stats.violations = viols.length;
        stats.critical = props.filter(p => Number(p.blight_score) >= 80).length;
        stats.high = props.filter(p => Number(p.blight_score) >= 60).length;
        if (props.length > 0) {
          stats.avgBlight = Math.round(
            props.reduce((sum, p) => sum + Number(p.blight_score), 0) / props.length
          );
        }
      }
    }

    const ragChunks = await retrieveContext(
      `${neighborhood.replace(/_/g, ' ')} neighborhood Philadelphia blight vacancy violations`,
      5
    );
    const ragContext = formatRagContext(ragChunks);

    const displayName = neighborhood.replace(/_/g, ' ');
    const prompt = `Summarize the housing situation in ${displayName}, Philadelphia in 3-4 sentences.

Live data for this neighborhood:
- Vacant/blighted properties: ${stats.vacant}
- Average blight score: ${stats.avgBlight}/100
- Critical-risk properties (80+): ${stats.critical}
- High-risk properties (60+): ${stats.high}
- Code violations recorded: ${stats.violations}

Cover the overall risk level, what's driving it, and the single most impactful intervention. Be direct and specific to these numbers.`;

    return await streamHolmesText({
      messages: [
        { role: 'system', content: HOLMES_SYSTEM_PROMPT + ragContext },
        { role: 'user', content: prompt },
      ],
      maxTokens: 400,
      temperature: 0.6,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
