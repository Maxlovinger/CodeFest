import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET(req: NextRequest) {
  try {
    await migrate();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '300'), 600);
    const tractId = searchParams.get('tract_id') || '';

    const params: unknown[] = [limit];
    let where = 'WHERE lat IS NOT NULL AND lng IS NOT NULL';
    if (tractId) {
      params.unshift(tractId);
      where += ' AND census_tract_id = $1';
    }

    const rows = await query(`
      SELECT site_name, street_address, zip, council_district, census_tract_id, program_type,
             public_wifi_available, current_internet_speed, speed_down_mbps, speed_up_mbps,
             pct_hh_no_internet, pct_hh_broadband, lat, lng
      FROM wifi_sites
      ${where}
      ORDER BY speed_down_mbps DESC NULLS LAST, site_name ASC
      LIMIT $${params.length}
    `, params);

    return Response.json({ sites: rows });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
