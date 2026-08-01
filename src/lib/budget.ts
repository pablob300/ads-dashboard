// Meta reporta o gasto de campanhas sem o imposto de 12,15% que incide sobre a verba.
// Para chegar no valor efetivo gasto, divide-se o gasto bruto por 0,8785 (= 1 - 0,1215).
// Único lugar do código onde esse ajuste deve acontecer.
export const META_TAX_GROSS_UP_DIVISOR = 0.8785;

export function grossUpMetaSpend(rawSpend: number): number {
  return rawSpend / META_TAX_GROSS_UP_DIVISOR;
}

export const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

/** Intervalo de datas de um mês fechado (ou até hoje, se for o mês corrente ainda em andamento) */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(year, month - 1, 1);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const end = isCurrentMonth ? today : new Date(year, month, 0); // dia 0 do próximo mês = último dia deste
  return { start, end };
}

export interface BudgetCampaignBreakdown {
  id: string;
  name: string;
  spend: number;
}

export interface BudgetRow {
  key: string;                  // subReportId, ou `fallback:${channel}`
  subReportId: string | null;
  channel: string;
  name: string;
  isFallback: boolean;
  budgetAmount: number | null;  // valor salvo; null = nunca preenchido
  spent: number;                // já com o ajuste de imposto do Meta aplicado
  campaigns: BudgetCampaignBreakdown[];
}

export interface BudgetTotals {
  budget: number;
  spent: number;
}

export interface GetBudgetResponse {
  year: number;
  month: number;
  rows: BudgetRow[];
  totals: {
    overall: BudgetTotals;
    byChannel: Record<string, BudgetTotals>;
  };
  errors: {
    google: string | null;
    meta: string | null;
  };
}
