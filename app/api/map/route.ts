import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layer = searchParams.get('layer') || 'vacant_buildings';
  const limit = Math.min(parseInt(searchParams.get('limit') || '2000'), 5000);

  try {
    await migrate();

    let rows: Record<string, unknown>[] = [];

    switch (layer) {
      case 'vacant_buildings':
        rows = await query(
          `SELECT id, parcel_id, address, owner, lat, lng, market_value, total_area, zip_code, blight_score, category
           FROM vacant_buildings
           WHERE lat IS NOT NULL AND lng IS NOT NULL
           ORDER BY blight_score DESC
           LIMIT $1`,
          [limit]
        );
        break;

      case 'vacant_land':
        rows = await query(
          `SELECT id, parcel_id, address, owner, lat, lng, total_area, zip_code
           FROM vacant_land
           WHERE lat IS NOT NULL AND lng IS NOT NULL
           LIMIT $1`,
          [limit]
        );
        break;

      case 'violations':
        rows = await query(
          `SELECT id, violation_id, address, lat, lng, violation_type, violation_date, status, description
           FROM violations
           WHERE lat IS NOT NULL AND lng IS NOT NULL
           ORDER BY violation_date DESC
           LIMIT $1`,
          [limit]
        );
        break;

      case 'evictions':
        rows = await query(
          `SELECT id, case_id, address, lat, lng, filing_date, judgment, amount
           FROM evictions
           WHERE lat IS NOT NULL AND lng IS NOT NULL
           ORDER BY filing_date DESC
           LIMIT $1`,
          [limit]
        );
        break;

      case 'heatmap':
        rows = await query(
          `SELECT lat, lng, blight_score as weight
           FROM vacant_buildings
           WHERE lat IS NOT NULL AND lng IS NOT NULL
           LIMIT $1`,
          [limit]
        );
        break;

      default:
        return Response.json({ error: 'Unknown layer' }, { status: 400 });
    }

    return Response.json({ layer, count: rows.length, data: rows });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
