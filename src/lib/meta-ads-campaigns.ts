import { META_BASE, MetaTokens } from "./meta-ads";

export interface MetaCampaignMetric {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;       // já em moeda real (não micros)
  conversions: number;
  ctr: number;
  cpc: number;
  costPerConversion: number;
}

export interface MetaDailyMetric {
  campaignId: string;
  date: string;        // YYYY-MM-DD
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface MetaCampaignData {
  isSampleData: boolean;
  campaigns: MetaCampaignMetric[];
  dailyMetrics: MetaDailyMetric[];
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function fetchMetaCampaignData(
  tokens: MetaTokens,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<MetaCampaignData> {
  try {
    const timeRange = JSON.stringify({ since: fmt(startDate), until: fmt(endDate) });
    const token = tokens.accessToken;

    // Métricas por campanha
    const campaignRes = await fetch(
      `${META_BASE}/${accountId}/insights?` +
      `fields=campaign_id,campaign_name,impressions,clicks,spend,actions` +
      `&level=campaign&time_range=${encodeURIComponent(timeRange)}` +
      `&limit=500&access_token=${token}`
    );

    if (!campaignRes.ok) throw new Error(`Meta API error: ${campaignRes.status}`);
    const campaignData = await campaignRes.json();

    // Métricas diárias por campanha
    const dailyRes = await fetch(
      `${META_BASE}/${accountId}/insights?` +
      `fields=campaign_id,impressions,clicks,spend,actions` +
      `&level=campaign&time_increment=1&time_range=${encodeURIComponent(timeRange)}` +
      `&limit=1000&access_token=${token}`
    );

    if (!dailyRes.ok) throw new Error(`Meta API daily error: ${dailyRes.status}`);
    const dailyData = await dailyRes.json();

    function extractConversions(actions: { action_type: string; value: string }[] | undefined): number {
      if (!actions) return 0;
      return actions
        .filter((a) => a.action_type.includes("purchase") || a.action_type.includes("lead") || a.action_type.includes("complete_registration"))
        .reduce((s, a) => s + parseFloat(a.value || "0"), 0);
    }

    const campaigns: MetaCampaignMetric[] = (campaignData.data ?? []).map(
      (c: { campaign_id: string; campaign_name: string; impressions: string; clicks: string; spend: string; actions?: { action_type: string; value: string }[] }) => {
        const impressions = parseInt(c.impressions || "0");
        const clicks = parseInt(c.clicks || "0");
        const spend = parseFloat(c.spend || "0");
        const conversions = extractConversions(c.actions);
        return {
          id: c.campaign_id,
          name: c.campaign_name,
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          costPerConversion: conversions > 0 ? spend / conversions : 0,
        };
      }
    );

    const dailyMetrics: MetaDailyMetric[] = (dailyData.data ?? []).map(
      (d: { campaign_id: string; date_start: string; impressions: string; clicks: string; spend: string; actions?: { action_type: string; value: string }[] }) => ({
        campaignId: d.campaign_id,
        date: d.date_start,
        impressions: parseInt(d.impressions || "0"),
        clicks: parseInt(d.clicks || "0"),
        spend: parseFloat(d.spend || "0"),
        conversions: extractConversions(d.actions),
      })
    );

    if (campaigns.length === 0) return generateMetaSampleData(startDate, endDate);

    return { isSampleData: false, campaigns, dailyMetrics };
  } catch {
    return generateMetaSampleData(startDate, endDate);
  }
}

export function generateMetaSampleData(startDate: Date, endDate: Date): MetaCampaignData {
  const campaigns: MetaCampaignMetric[] = [
    { id: "m1", name: "Campanha Alcance - Feed", impressions: 85000, clicks: 1700, spend: 1200, conversions: 28, ctr: 2.0, cpc: 0.71, costPerConversion: 42.86 },
    { id: "m2", name: "Remarketing - Carrinho",  impressions: 22000, clicks: 990,  spend: 850,  conversions: 45, ctr: 4.5, cpc: 0.86, costPerConversion: 18.89 },
    { id: "m3", name: "Prospecção - Lookalike",  impressions: 60000, clicks: 900,  spend: 1600, conversions: 18, ctr: 1.5, cpc: 1.78, costPerConversion: 88.89 },
    { id: "m4", name: "Stories - Conversão",     impressions: 38000, clicks: 760,  spend: 980,  conversions: 32, ctr: 2.0, cpc: 1.29, costPerConversion: 30.63 },
    { id: "m5", name: "Catálogo Dinâmico",       impressions: 15000, clicks: 600,  spend: 620,  conversions: 22, ctr: 4.0, cpc: 1.03, costPerConversion: 28.18 },
  ];

  const days: MetaDailyMetric[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const date = cur.toISOString().slice(0, 10);
    for (const c of campaigns) {
      const base = 0.6 + Math.random() * 0.8;
      days.push({
        campaignId: c.id,
        date,
        impressions: Math.round((c.impressions / 30) * base),
        clicks:      Math.round((c.clicks / 30) * base),
        spend:       Math.round((c.spend / 30) * base * 100) / 100,
        conversions: Math.round((c.conversions / 30) * base),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { isSampleData: true, campaigns, dailyMetrics: days };
}
