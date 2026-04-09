import { query } from './db';

const CSV_URL =
  'https://raw.githubusercontent.com/appliedaistudio/inhibitor-lab/main/codefest/challenge-3-glass-box/sample_logs/set_a/inhibitor_logs.csv';
const JSONL_URL =
  'https://raw.githubusercontent.com/appliedaistudio/inhibitor-lab/main/codefest/challenge-3-glass-box/sample_logs/set_a/inhibitor_events.jsonl';

interface AuditCsvRow {
  source: string;
  event_timestamp: string;
  api_key: string;
  event_type: string;
  meta: Record<string, unknown>;
}

interface AuditJsonlRow {
  source: string;
  event_timestamp: string;
  request_id: string;
  agent_id: string;
  mode: string;
  event_type: string;
  severity: string;
  action: string;
  policy_trigger: string;
  reason: string;
  proposed_action: string;
  corrected_action: string;
  meta: Record<string, unknown>;
}

function parseLooseObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(raw.replace(/'/g, '"'));
    } catch {
      return { raw };
    }
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  out.push(current);
  return out;
}

async function insertCsvBatch(rows: AuditCsvRow[]): Promise<void> {
  if (!rows.length) return;
  await query(
    `INSERT INTO audit_events (
      source, event_timestamp, api_key, event_type, meta, created_at
    )
    SELECT source, event_timestamp, api_key, event_type, meta, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS x(
      source TEXT,
      event_timestamp TIMESTAMPTZ,
      api_key TEXT,
      event_type TEXT,
      meta JSONB
    )`,
    [JSON.stringify(rows)]
  );
}

async function insertJsonlBatch(rows: AuditJsonlRow[]): Promise<void> {
  if (!rows.length) return;
  await query(
    `INSERT INTO audit_events (
      source, event_timestamp, request_id, agent_id, mode, event_type, severity,
      action, policy_trigger, reason, proposed_action, corrected_action, meta, created_at
    )
    SELECT
      source, event_timestamp, request_id, agent_id, mode, event_type, severity,
      action, policy_trigger, reason, proposed_action, corrected_action, meta, NOW()
    FROM jsonb_to_recordset($1::jsonb) AS x(
      source TEXT,
      event_timestamp TIMESTAMPTZ,
      request_id TEXT,
      agent_id TEXT,
      mode TEXT,
      event_type TEXT,
      severity TEXT,
      action TEXT,
      policy_trigger TEXT,
      reason TEXT,
      proposed_action TEXT,
      corrected_action TEXT,
      meta JSONB
    )`,
    [JSON.stringify(rows)]
  );
}

export async function ingestAuditData(): Promise<{ events: number }> {
  const [csvRes, jsonlRes] = await Promise.all([
    fetch(CSV_URL, { headers: { Accept: 'text/plain' } }),
    fetch(JSONL_URL, { headers: { Accept: 'text/plain' } }),
  ]);

  if (!csvRes.ok) throw new Error(`Audit CSV fetch failed: ${csvRes.status}`);
  if (!jsonlRes.ok) throw new Error(`Audit JSONL fetch failed: ${jsonlRes.status}`);

  const csvText = await csvRes.text();
  const jsonlText = await jsonlRes.text();

  await query(`DELETE FROM audit_events;`);

  const csvLines = csvText.trim().split('\n').slice(1);
  const csvRows: AuditCsvRow[] = [];
  const jsonlRows: AuditJsonlRow[] = [];

  for (const line of csvLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 5) continue;
    const [, timestamp, apiKey, eventType, metaRaw] = cols;
    csvRows.push({
      source: 'inhibitor_csv',
      event_timestamp: timestamp,
      api_key: apiKey,
      event_type: eventType,
      meta: parseLooseObject(metaRaw),
    });
  }

  for (const line of jsonlText.trim().split('\n')) {
    if (!line.trim()) continue;
    const event = JSON.parse(line) as Record<string, unknown>;
    jsonlRows.push({
      source: 'inhibitor_jsonl',
      event_timestamp: String(event.timestamp ?? ''),
      request_id: String(event.request_id ?? ''),
      agent_id: String(event.agent_id ?? ''),
      mode: String(event.mode ?? ''),
      event_type: 'policy_event',
      severity: String(event.severity ?? ''),
      action: String(event.action ?? ''),
      policy_trigger: String(event.policy_trigger ?? ''),
      reason: String(event.reason ?? ''),
      proposed_action: String(event.proposed_action ?? ''),
      corrected_action: String(event.corrected_action ?? ''),
      meta: event,
    });
  }

  await insertCsvBatch(csvRows);
  await insertJsonlBatch(jsonlRows);

  const inserted = csvRows.length + jsonlRows.length;

  await query(
    `INSERT INTO ingestion_log (source, records_ingested, status)
     VALUES ($1, $2, $3)`,
    ['audit_events', inserted, 'success']
  );

  return { events: inserted };
}
