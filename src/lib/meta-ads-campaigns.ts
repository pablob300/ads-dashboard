import { META_BASE, MetaTokens } from "./meta-ads";

export interface MetaCampaignMetric {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;       // já em moeda real (não micros)
  /**
   * Quantidade de resultados da campanha — a coluna "Resultados" do gerenciador,
   * qualquer que seja o tipo (lead, conversa iniciada, compra...).
   * O nome do campo continua `conversions` porque é o contrato compartilhado com o
   * Google Ads, com FunnelMetrics, com o Controle de Orçamento e com a página de share.
   */
  conversions: number;
  /** Rótulo do tipo de resultado desta campanha, ex: "Conversas iniciadas". */
  resultType?: string;
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

/**
 * Tradução do `indicator` do campo `results` da Graph API para o rótulo que o
 * gerenciador do Meta exibe. Um tipo fora desta lista cai no fallback de
 * `resultTypeLabel()` — nunca quebra, só mostra o indicator cru sem o prefixo.
 */
const META_RESULT_LABELS: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "Conversas iniciadas",
  "onsite_conversion.total_messaging_connection": "Conexões por mensagem",
  "leadgen.other": "Leads (form)",
  "leadgen_grouped": "Leads (form)",
  "offsite_conversion.fb_pixel_lead": "Leads (site)",
  "onsite_conversion.lead_grouped": "Leads",
  lead: "Leads",
  "offsite_conversion.fb_pixel_purchase": "Compras",
  purchase: "Compras",
  "offsite_conversion.fb_pixel_complete_registration": "Cadastros",
  complete_registration: "Cadastros",
  "offsite_conversion.fb_pixel_add_to_cart": "Adições ao carrinho",
  "offsite_conversion.fb_pixel_initiate_checkout": "Finalizações iniciadas",
  link_click: "Cliques no link",
  landing_page_view: "Visualizações da página",
  post_engagement: "Engajamento",
  page_engagement: "Engajamento na página",
  like: "Curtidas na página",
  video_thruplay_watched_actions: "ThruPlays",
  video_view: "Visualizações do vídeo",
  reach: "Alcance",
  impressions: "Impressões",
  app_install: "Instalações do app",
};

/** Converte o `indicator` bruto (ex: "actions:leadgen.other") no rótulo exibível. */
function resultTypeLabel(indicator: string | undefined): string | undefined {
  if (!indicator) return undefined;
  const key = indicator.replace(/^actions:/, "");
  return META_RESULT_LABELS[key] ?? key;
}

interface MetaResultEntry {
  indicator?: string;
  values?: { value?: string }[];
}

/** Linhas cruas devolvidas pelo endpoint /insights. */
interface MetaInsightsRow {
  campaign_id: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
  results?: unknown;
}
interface MetaCampaignRow extends MetaInsightsRow {
  campaign_name: string;
}
interface MetaDailyRow extends MetaInsightsRow {
  date_start: string;
}

/**
 * O campo `results` da Graph API é documentado como array, mas dependendo da versão
 * e do nível consultado vem como objeto único. Normaliza os dois formatos.
 */
function firstResultEntry(results: unknown): MetaResultEntry | undefined {
  if (Array.isArray(results)) return results[0] as MetaResultEntry | undefined;
  if (results && typeof results === "object") return results as MetaResultEntry;
  return undefined;
}

/** Extrai mensagem legível de um erro da Graph API, detectando token expirado/inválido (code 190) */
function metaErrorMessage(body: unknown, status: number): string {
  const e = (body as { error?: { message?: string; code?: number } })?.error;
  if (e?.code === 190) {
    return "Token do Meta expirado ou inválido. Reconecte a conta em Integrações > Meta Ads.";
  }
  return e?.message ?? `Erro na API do Meta Ads (${status})`;
}

/** O erro é "esse campo não existe nesta versão da API"? (code 100 + menção ao campo) */
function isUnknownFieldError(body: unknown): boolean {
  const e = (body as { error?: { message?: string; code?: number } })?.error;
  if (e?.code !== 100) return false;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("results") && (msg.includes("nonexistent") || msg.includes("field"));
}

/**
 * Faz a chamada de insights pedindo `results`. Se a versão da Graph API em uso não
 * conhecer o campo, repete a chamada sem ele — assim uma incompatibilidade de versão
 * degrada para a contagem antiga (por `actions`) em vez de derrubar a aba Meta inteira.
 */
async function fetchInsights<T>(baseFields: string, query: string): Promise<{ data?: T[] }> {
  const call = (fields: string) =>
    fetch(`${META_BASE}${query.replace("__FIELDS__", fields)}`);

  let res = await call(`${baseFields},results`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (!isUnknownFieldError(err)) throw new Error(metaErrorMessage(err, res.status));
    res = await call(baseFields);
    if (!res.ok) {
      const retryErr = await res.json().catch(() => ({}));
      throw new Error(metaErrorMessage(retryErr, res.status));
    }
  }
  return res.json();
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
  const campaignData = await fetchInsights<MetaCampaignRow>(
    "campaign_id,campaign_name,impressions,clicks,spend,actions",
    `/${accountId}/insights?fields=__FIELDS__` +
    `&level=campaign&time_range=${encodeURIComponent(timeRange)}` +
    `&limit=500&access_token=${token}`
  );

  // Métricas diárias por campanha
  const dailyData = await fetchInsights<MetaDailyRow>(
    "campaign_id,impressions,clicks,spend,actions",
    `/${accountId}/insights?fields=__FIELDS__` +
    `&level=campaign&time_increment=1&time_range=${encodeURIComponent(timeRange)}` +
    `&limit=1000&access_token=${token}`
  );

  /**
   * Heurística antiga: só reconhecia purchase/lead/complete_registration. Fica como
   * fallback para o caso do `results` não vir (versão de API antiga, campanha sem
   * objetivo mapeável). Sozinha ela zerava campanhas de mensagem, que é o bug original.
   */
  function extractConversionsFromActions(actions: { action_type: string; value: string }[] | undefined): number {
    if (!actions) return 0;
    return actions
      .filter((a) => a.action_type.includes("purchase") || a.action_type.includes("lead") || a.action_type.includes("complete_registration"))
      .reduce((s, a) => s + parseFloat(a.value || "0"), 0);
  }

  /**
   * Fonte primária: o campo `results` da Graph API — a coluna "Resultados" do
   * gerenciador, já resolvida pelo Meta a partir do objetivo da campanha, qualquer que
   * seja o tipo de resultado. Sem resultado no período, o Meta devolve só o `indicator`
   * (sem `values`), que vira 0.
   */
  function extractResults(row: MetaInsightsRow): { value: number; resultType?: string } {
    const entry = firstResultEntry(row.results);
    const resultType = resultTypeLabel(entry?.indicator);
    if (!entry) return { value: extractConversionsFromActions(row.actions), resultType };
    const raw = entry.values?.[0]?.value;
    if (raw == null) return { value: 0, resultType };
    return { value: parseFloat(raw) || 0, resultType };
  }

  const campaigns: MetaCampaignMetric[] = (campaignData.data ?? []).map(
    (c) => {
      const impressions = parseInt(c.impressions || "0");
      const clicks = parseInt(c.clicks || "0");
      const spend = parseFloat(c.spend || "0");
      const { value: conversions, resultType } = extractResults(c);
      return {
        id: c.campaign_id,
        name: c.campaign_name,
        impressions,
        clicks,
        spend,
        conversions,
        resultType,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
      };
    }
  );

  const dailyMetrics: MetaDailyMetric[] = (dailyData.data ?? []).map(
    (d) => ({
      campaignId: d.campaign_id,
      date: d.date_start,
      impressions: parseInt(d.impressions || "0"),
      clicks: parseInt(d.clicks || "0"),
      spend: parseFloat(d.spend || "0"),
      conversions: extractResults(d).value,
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
