import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parcelId = searchParams.get('parcel_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';
  const riskTier = searchParams.get('risk_tier') || '';

  try {
    if (parcelId) {
      const rows = await query(
        `SELECT vb.*,
          COALESCE(json_agg(DISTINCT jsonb_build_object(
            'violation_id', v.violation_id,
            'violation_type', v.violation_type,
            'violation_date', v.violation_date,
            'status', v.status,
            'description', v.description
          )) FILTER (WHERE v.id IS NOT NULL), '[]') as violations
         FROM vacant_buildings vb
         LEFT JOIN violations v ON v.address = vb.address
         WHERE vb.parcel_id = $1
         GROUP BY vb.id`,
        [parcelId]
      );
      return Response.json(rows[0] || null);
    }

    let whereClause = 'WHERE lat IS NOT NULL AND lng IS NOT NULL';
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (address ILIKE $${params.length} OR owner ILIKE $${params.length} OR zip_code ILIKE $${params.length})`;
    }

    if (riskTier) {
      const tierMap: Record<string, [number, number]> = {
        critical: [80, 100],
        high: [60, 79],
        medium: [40, 59],
        low: [0, 39],
      };
      const range = tierMap[riskTier];
      if (range) {
        params.push(range[0], range[1]);
        whereClause += ` AND blight_score BETWEEN $${params.length - 1} AND $${params.length}`;
      }
    }

    params.push(limit, offset);
    const rows = await query(
      `SELECT id, parcel_id, address, owner, lat, lng, market_value, total_area, zip_code, blight_score, category
       FROM vacant_buildings
       ${whereClause}
       ORDER BY blight_score DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM vacant_buildings ${whereClause}`,
      params.slice(0, -2)
    );

    return Response.json({
      properties: rows,
      total: parseInt(countRows[0]?.total || '0'),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
