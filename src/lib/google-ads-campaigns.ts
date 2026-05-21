import { getValidAccessToken } from "./google-ads";

const GOOGLE_ADS_API_VERSION = "v20";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface CampaignMetric {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  costBRL: number;
  conversions: number;
  ctr: number;
  costPerConversion: number;
}

export interface DailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  costBRL: number;
  conversions: number;
}

export interface CampaignData {
  isSampleData: boolean;
  campaigns: CampaignMetric[];
  dailyMetrics: DailyMetric[];
}

async function gaqlQuery(
  customerId: string,
  accessToken: string,
  query: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE_URL}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ?? `GAQL error ${res.status}`
    );
  }

  const data = await res.json();
  return (data.results ?? []) as Record<string, unknown>[];
}

function microsToBRL(micros: number): number {
  return micros / 1_000_000;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function fetchCampaignData(
  tokens: TokenSet,
  customerId: string,
  startDate: Date,
  endDate: Date
): Promise<CampaignData> {
  const accessToken = await getValidAccessToken(tokens);
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const [campaignRows, dailyRows] = await Promise.all([
    gaqlQuery(
      customerId,
      accessToken,
      `SELECT campaign.id, campaign.name,
              metrics.impressions, metrics.clicks,
              metrics.cost_micros, metrics.conversions
       FROM campaign
       WHERE segments.date BETWEEN '${start}' AND '${end}'
         AND metrics.impressions > 0
       ORDER BY metrics.cost_micros DESC`
    ),
    gaqlQuery(
      customerId,
      accessToken,
      `SELECT segments.date,
              metrics.impressions, metrics.clicks,
              metrics.cost_micros, metrics.conversions
       FROM campaign
       WHERE segments.date BETWEEN '${start}' AND '${end}'
       ORDER BY segments.date ASC`
    ),
  ]);

  // Agrega campanhas (pode haver múltiplas linhas por campanha)
  const campaignMap = new Map<string, CampaignMetric>();
  for (const row of campaignRows) {
    const c = row.campaign as { id: string; name: string };
    const m = row.metrics as {
      impressions: number; clicks: number;
      costMicros: number; conversions: number;
    };
    const existing = campaignMap.get(c.id);
    if (existing) {
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.costBRL += microsToBRL(m.costMicros ?? 0);
      existing.conversions += m.conversions;
    } else {
      campaignMap.set(c.id, {
        id: c.id,
        name: c.name,
        impressions: m.impressions,
        clicks: m.clicks,
        costBRL: microsToBRL(m.costMicros ?? 0),
        conversions: m.conversions,
        ctr: 0,
        costPerConversion: 0,
      });
    }
  }

  const campaigns: CampaignMetric[] = Array.from(campaignMap.values()).map((c) => ({
    ...c,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    costPerConversion: c.conversions > 0 ? c.costBRL / c.conversions : 0,
  }));

  // Agrega métricas diárias
  const dailyMap = new Map<string, DailyMetric>();
  for (const row of dailyRows) {
    const date = (row.segments as { date: string }).date;
    const m = row.metrics as {
      impressions: number; clicks: number;
      costMicros: number; conversions: number;
    };
    const existing = dailyMap.get(date);
    if (existing) {
      existing.impressions += m.impressions;
      existing.clicks += m.clicks;
      existing.costBRL += microsToBRL(m.costMicros ?? 0);
      existing.conversions += m.conversions;
    } else {
      dailyMap.set(date, {
        date,
        impressions: m.impressions,
        clicks: m.clicks,
        costBRL: microsToBRL(m.costMicros ?? 0),
        conversions: m.conversions,
      });
    }
  }

  return {
    isSampleData: false,
    campaigns,
    dailyMetrics: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
