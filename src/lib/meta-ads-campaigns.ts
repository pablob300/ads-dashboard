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

/** Extrai mensagem legível de um erro da Graph API, detectando token expirado/inválido (code 190) */
function metaErrorMessage(body: unknown, status: number): string {
  const e = (body as { error?: { message?: string; code?: number } })?.error;
  if (e?.code === 190) {
    return "Token do Meta expirado ou inválido. Reconecte a conta em Integrações > Meta Ads.";
  }
  return e?.message ?? `Erro na API do Meta Ads (${status})`;
}

export async function fetchMetaCampaignData(
  tokens: MetaTokens,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<MetaCampaignData> {
  if (tokens.expiresAt && tokens.expiresAt < new Date()) {
    throw new Error("Token do Meta expirado. Reconecte a conta em Integrações > Meta Ads.");
  }

  const timeRange = JSON.stringify({ since: fmt(startDate), until: fmt(endDate) });
  const token = tokens.accessToken;

  // Métricas por campanha
  const campaignRes = await fetch(
    `${META_BASE}/${accountId}/insights?` +
    `fields=campaign_id,campaign_name,impressions,clicks,spend,actions` +
    `&level=campaign&time_range=${encodeURIComponent(timeRange)}` +
    `&limit=500&access_token=${token}`
  );

  if (!campaignRes.ok) {
    const err = await campaignRes.json().catch(() => ({}));
    throw new Error(metaErrorMessage(err, campaignRes.status));
  }
  const campaignData = await campaignRes.json();

  // Métricas diárias por campanha
  const dailyRes = await fetch(
    `${META_BASE}/${accountId}/insights?` +
    `fields=campaign_id,impressions,clicks,spend,actions` +
    `&level=campaign&time_increment=1&time_range=${encodeURIComponent(timeRange)}` +
    `&limit=1000&access_token=${token}`
  );

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}));
    throw new Error(metaErrorMessage(err, dailyRes.status));
  }
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

  return { isSampleData: false, campaigns, dailyMetrics };
}

export interface MetaBalanceResult {
  balance: number | null;
  rawData: Record<string, unknown>;
  httpStatus: number;
}

// Extrai valor numérico de strings como "Saldo disponível (R$1.042,37 BRL)"
function parseBRLFromDisplayString(s: string): number | null {
  const match = s.match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) return null;
  const val = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  return isNaN(val) ? null : val;
}

export async function fetchMetaAdsBalance(
  tokens: MetaTokens,
  accountId: string
): Promise<MetaBalanceResult> {
  try {
    const res = await fetch(
      `${META_BASE}/${accountId}?fields=balance,amount_spent,currency,spend_cap,funding_source_details&access_token=${tokens.accessToken}`
    );
    const rawData: Record<string, unknown> = await res.json();
    if (!res.ok) return { balance: null, rawData, httpStatus: res.status };

    // Fonte primária: funding_source_details.display_string (valor real exibido no Meta)
    const fsd = rawData.funding_source_details as Record<string, unknown> | undefined;
    const displayString = fsd?.display_string as string | undefined;
    if (displayString) {
      const balance = parseBRLFromDisplayString(displayString);
      if (balance !== null) return { balance, rawData, httpStatus: res.status };
    }

    // Fallback: campo balance (em centavos)
    const balance = rawData.balance != null ? parseFloat(rawData.balance as string) / 100 : null;
    return { balance, rawData, httpStatus: res.status };
  } catch (e) {
    return { balance: null, rawData: { error: String(e) }, httpStatus: 0 };
  }
}
