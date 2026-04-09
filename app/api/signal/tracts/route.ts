import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

function describePhillyArea(lat: number, lng: number): string {
  if (lat > 40.03) return 'Far Northeast Philadelphia';
  if (lat > 39.995 && lng < -75.19) return 'Northwest Philadelphia';
  if (lat > 39.99 && lng > -75.12) return 'Lower Northeast Philadelphia';
  if (lat > 39.975 && lng < -75.18) return 'North Philadelphia';
  if (lat > 39.95 && lat <= 39.975 && lng > -75.18 && lng < -75.13) return 'Center City';
  if (lat > 39.94 && lng < -75.2) return 'West Philadelphia';
  if (lat < 39.93 && lng < -75.18) return 'Southwest Philadelphia';
  if (lat < 39.935) return 'South Philadelphia';
  if (lng > -75.1) return 'River Wards / Delaware Waterfront';
  return 'Philadelphia';
}

export async function GET(req: NextRequest) {
  try {
    await migrate();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 400);
    const riskTier = searchParams.get('risk_tier') || '';

    const params: unknown[] = [limit];
    let where = '';
    if (riskTier && riskTier !== 'all') {
      params.unshift(riskTier);
      where = 'WHERE risk_tier = $1';
    }

    const rows = await query<{
      geoid: string;
      name: string;
      place_label: string;
      geojson: { geometry: { type: string; coordinates: unknown } };
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
    }>(`
      SELECT geoid, name, geojson, centroid_lat, centroid_lng, pct_broadband, pct_no_internet,
             pct_no_devices, pct_minority, median_income, population, wifi_site_count,
             avg_site_speed_mbps, risk_score, risk_tier
      FROM connectivity_tracts
      ${where}
      ORDER BY risk_score DESC NULLS LAST
      LIMIT $${params.length}
    `, params);

    return Response.json({
      tracts: rows.map(row => ({
        ...row,
        place_label: describePhillyArea(Number(row.centroid_lat || 0), Number(row.centroid_lng || 0)),
      })),
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
