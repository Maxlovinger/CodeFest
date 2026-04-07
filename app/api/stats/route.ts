import { query } from '@/lib/db';
import { migrate } from '@/lib/db/migrate';

export async function GET() {
  try {
    await migrate();
    const stats = await query<{
      vacant_buildings: string;
      vacant_land: string;
      violations: string;
      evictions: string;
      neighborhoods: string;
      last_ingestion: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM vacant_buildings) as vacant_buildings,
        (SELECT COUNT(*) FROM vacant_land) as vacant_land,
        (SELECT COUNT(*) FROM violations) as violations,
        (SELECT COUNT(*) FROM evictions) as evictions,
        (SELECT COUNT(*) FROM neighborhoods) as neighborhoods,
        (SELECT MAX(ingested_at) FROM ingestion_log WHERE status='success') as last_ingestion
    `);
    return Response.json(stats[0] || {});
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
