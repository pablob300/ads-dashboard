import { getValidAccessToken } from "./google-ads";

const GOOGLE_ADS_API_VERSION = "v21";
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
  campaignId: string;
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
    console.error("[gaqlQuery] error", res.status, JSON.stringify(err).slice(0, 800));
    const details = (err as { error?: { details?: unknown[] } })?.error?.details;
    const detailStr = details ? ` | details: ${JSON.stringify(details).slice(0, 300)}` : "";
    throw new Error(
      ((err as { error?: { message?: string } })?.error?.message ?? `GAQL error ${res.status}`) + detailStr
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
         AND metrics.cost_micros > 0
       ORDER BY metrics.cost_micros DESC`
    ),
    gaqlQuery(
      customerId,
      accessToken,
      `SELECT campaign.id, segments.date,
              metrics.impressions, metrics.clicks,
              metrics.cost_micros, metrics.conversions
       FROM campaign
       WHERE segments.date BETWEEN '${start}' AND '${end}'
       ORDER BY segments.date ASC`
    ),
  ]);

  // Agrega campanhas (pode haver múltiplas linhas por campanha)
  // Number() é obrigatório: a API retorna impressions/clicks como strings no JSON
  const campaignMap = new Map<string, CampaignMetric>();
  for (const row of campaignRows) {
    const c = row.campaign as { id: string; name: string };
    const m = row.metrics as {
      impressions: unknown; clicks: unknown;
      costMicros: unknown; conversions: unknown;
    };
    const impressions  = Number(m.impressions  ?? 0);
    const clicks       = Number(m.clicks       ?? 0);
    const costBRL      = microsToBRL(Number(m.costMicros ?? 0));
    const conversions  = Number(m.conversions  ?? 0);
    const existing = campaignMap.get(c.id);
    if (existing) {
      existing.impressions += impressions;
      existing.clicks      += clicks;
      existing.costBRL     += costBRL;
      existing.conversions += conversions;
    } else {
      campaignMap.set(c.id, {
        id: c.id,
        name: c.name,
        impressions,
        clicks,
        costBRL,
        conversions,
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

  // Métricas diárias por campanha — chave campaignId:date para evitar duplicatas entre contas
  const dailyMap = new Map<string, DailyMetric>();
  for (const row of dailyRows) {
    const campaignId = (row.campaign as { id: string }).id;
    const date = (row.segments as { date: string }).date;
    const m = row.metrics as {
      impressions: unknown; clicks: unknown;
      costMicros: unknown; conversions: unknown;
    };
    const impressions  = Number(m.impressions  ?? 0);
    const clicks       = Number(m.clicks       ?? 0);
    const costBRL      = microsToBRL(Number(m.costMicros ?? 0));
    const conversions  = Number(m.conversions  ?? 0);
    const key = `${campaignId}:${date}`;
    const existing = dailyMap.get(key);
    if (existing) {
      existing.impressions += impressions;
      existing.clicks      += clicks;
      existing.costBRL     += costBRL;
      existing.conversions += conversions;
    } else {
      dailyMap.set(key, { campaignId, date, impressions, clicks, costBRL, conversions });
    }
  }

  return {
    isSampleData: false,
    campaigns,
    dailyMetrics: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function fetchGoogleAdsBalance(
  tokens: TokenSet,
  customerId: string
): Promise<number | null> {
  try {
    const accessToken = await getValidAccessToken(tokens);
    const rows = await gaqlQuery(
      customerId,
      accessToken,
      `SELECT
         account_budget.approved_spending_limit_micros,
         account_budget.approved_spending_limit_type,
         account_budget.amount_served_micros
       FROM account_budget
       WHERE account_budget.status = 'APPROVED'
       ORDER BY account_budget.id DESC
       LIMIT 1`
    );
    if (!rows.length) return null;
    const b = rows[0].accountBudget as {
      approvedSpendingLimitType?: string;
      approvedSpendingLimitMicros?: unknown;
      amountServedMicros?: unknown;
    };
    if (!b || b.approvedSpendingLimitType === "INFINITE") return null;
    return microsToBRL(
      Number(b.approvedSpendingLimitMicros ?? 0) - Number(b.amountServedMicros ?? 0)
    );
  } catch {
    return null;
  }
}

export interface BudgetRecommendation {
  resourceName: string;
  campaignId: string;
  campaignName: string;
  currentBudgetBRL: number;
  recommendedBudgetBRL: number;
  baseImpressions: number;
  potentialImpressions: number;
}

export async function fetchBudgetRecommendations(
  tokens: TokenSet,
  customerId: string
): Promise<BudgetRecommendation[]> {
  try {
    const accessToken = await getValidAccessToken(tokens);
    const rows = await gaqlQuery(
      customerId,
      accessToken,
      `SELECT
         recommendation.resource_name,
         recommendation.campaign_budget_recommendation.current_budget_amount_micros,
         recommendation.campaign_budget_recommendation.recommended_budget_amount_micros,
         recommendation.impact.base_metrics.impressions,
         recommendation.impact.potential_metrics.impressions,
         campaign.id,
         campaign.name
       FROM recommendation
       WHERE recommendation.type = 'CAMPAIGN_BUDGET'`
    );

    return rows.map((row) => {
      const rec = row.recommendation as {
        resourceName: string;
        campaignBudgetRecommendation: {
          currentBudgetAmountMicros: unknown;
          recommendedBudgetAmountMicros: unknown;
        };
        impact: {
          baseMetrics: { impressions: unknown };
          potentialMetrics: { impressions: unknown };
        };
      };
      const campaign = row.campaign as { id: string; name: string };
      return {
        resourceName: rec.resourceName,
        campaignId: campaign.id,
        campaignName: campaign.name,
        currentBudgetBRL: microsToBRL(Number(rec.campaignBudgetRecommendation.currentBudgetAmountMicros ?? 0)),
        recommendedBudgetBRL: microsToBRL(Number(rec.campaignBudgetRecommendation.recommendedBudgetAmountMicros ?? 0)),
        baseImpressions: Number(rec.impact?.baseMetrics?.impressions ?? 0),
        potentialImpressions: Number(rec.impact?.potentialMetrics?.impressions ?? 0),
      };
    });
  } catch {
    return [];
  }
}
