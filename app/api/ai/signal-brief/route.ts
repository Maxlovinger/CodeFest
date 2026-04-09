import { NextRequest } from 'next/server';
import { formatAiError, HOLMES_BEHAVIOR_PROMPT, HOLMES_SYSTEM_PROMPT, streamHolmesText } from '@/lib/ai';
import { formatRagContext, retrieveContext } from '@/lib/rag';

function toPercent(value: unknown): number {
  const numeric = Number(value || 0);
  return numeric <= 1 ? numeric * 100 : numeric;
}

function formatPercent(value: unknown): string {
  return `${toPercent(value).toFixed(1)}%`;
}

function buildDriverSummary(tract: Record<string, unknown>): string[] {
  const noInternet = toPercent(tract.pct_no_internet);
  const broadband = toPercent(tract.pct_broadband);
  const noDevices = toPercent(tract.pct_no_devices);
  const wifiSites = Number(tract.wifi_site_count || 0);
  const medianIncome = Number(tract.median_income || 0);

  const drivers: string[] = [];

  if (noInternet >= 12) {
    drivers.push(`A meaningful share of households lack internet service (${noInternet.toFixed(1)}%).`);
  }
  if (broadband > 0 && broadband <= 75) {
    drivers.push(`Broadband access is weaker than a well-connected tract (${broadband.toFixed(1)}%).`);
  }
  if (noDevices >= 8) {
    drivers.push(`Device scarcity is elevated (${noDevices.toFixed(1)}% of households without devices).`);
  }
  if (wifiSites === 0) {
    drivers.push('There are no mapped public Wi-Fi fallback sites inside this tract.');
  } else if (wifiSites <= 1) {
    drivers.push(`Public fallback access is thin with only ${wifiSites} mapped Wi-Fi site.`);
  }
  if (medianIncome > 0 && medianIncome <= 55000) {
    drivers.push(`Income pressure may make service disruption harder to absorb (median income $${Math.round(medianIncome).toLocaleString()}).`);
  }

  return drivers;
}

export async function POST(req: NextRequest) {
  try {
    const { tract } = await req.json();

    if (!tract) {
      return Response.json({ error: 'tract required' }, { status: 400 });
    }

    const tractName = tract.name || tract.geoid || 'this tract';
    const noInternetPct = formatPercent(tract.pct_no_internet);
    const broadbandPct = formatPercent(tract.pct_broadband);
    const noDevicesPct = formatPercent(tract.pct_no_devices);
    const derivedDrivers = buildDriverSummary(tract);
    const driverBlock = derivedDrivers.length
      ? derivedDrivers.map(driver => `- ${driver}`).join('\n')
      : '- No single metric is clearly elevated. Explain that the tract may still score high because the model blends multiple smaller signals together.';

    const prompt = `Write a short plain-English brief for a Philadelphia connectivity tract.

Tract details:
- Name: ${tractName}
- Tract ID: ${tract.geoid || 'Unknown'}
- Risk score: ${Math.round(Number(tract.risk_score || 0))}/100
- Risk tier: ${tract.risk_tier || 'unknown'}
- Households without internet: ${noInternetPct}
- Broadband access: ${broadbandPct}
- Households without devices: ${noDevicesPct}
- Public Wi-Fi sites: ${Number(tract.wifi_site_count || 0)}
- Average site speed: ${Math.round(Number(tract.avg_site_speed_mbps || 0)) || 0} Mbps
- Median income: $${Math.round(Number(tract.median_income || 0)).toLocaleString()}
- Population represented: ${Math.round(Number(tract.population || 0)).toLocaleString()}

Derived likely drivers from the tract data:
${driverBlock}

Accuracy rules:
- Never describe a metric as a major risk driver if it is 0.0% or otherwise favorable.
- If households without internet is 0.0%, say that it is not currently a major driver.
- If broadband access is 0.0%, treat it as missing or unreliable unless the other tract facts clearly support that interpretation.
- Use the derived driver list above as the primary explanation of what is raising risk.
- If the data does not show a clear driver, say that directly instead of inventing one.

Do three things:
1. Explain what this risk score means for a regular resident.
2. Explain the biggest drivers of risk in this tract.
3. Suggest the single most useful next action for a city team or provider.

Keep it concise, specific, and grounded in the numbers above.`;

    const ragChunks = await retrieveContext(`Philadelphia connectivity access risk tract ${tractName} ${tract.geoid || ''} internet broadband digital divide`, 6);
    const ragContext = formatRagContext(ragChunks);

    return await streamHolmesText({
      messages: [
        {
          role: 'system',
          content:
            HOLMES_SYSTEM_PROMPT +
            HOLMES_BEHAVIOR_PROMPT +
            ragContext +
            '\n\nCurrent UI context:\nThe user has selected a single connectivity tract on the Signal map and wants a tract-specific explanation.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 350,
      temperature: 0.55,
    });
  } catch (error) {
    return new Response(formatAiError(error), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
