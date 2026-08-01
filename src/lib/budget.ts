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

/** Sentinela usado no formulário para representar "Total (sem sub-relatório)" — vira subReportId: null */
export const TOTAL_SENTINEL = "__total__";

/** Opção crua de sub-relatório, usada para montar os selects do formulário */
export interface SubReportOption {
  id: string;
  name: string;
  channel: string;
}

/** Uma verba já salva para o mês, com o gasto real já resolvido (e com o imposto do Meta já aplicado) */
export interface BudgetEntryRow {
  subReportId: string | null; // null = linha "Total {Canal}" (sem sub-relatório)
  channel: string;
  name: string;               // nome do sub-relatório, ou "Total {Canal}" para o fallback
  budgetAmount: number;
  spent: number;
}

export interface GetBudgetResponse {
  year: number;
  month: number;
  subReports: SubReportOption[];   // todos os sub-relatórios reais do cliente (para popular os selects)
  availableChannels: string[];     // canais com conta vinculada, ex: ["google", "meta"]
  entries: BudgetEntryRow[];       // só o que já foi salvo pra esse mês
  errors: {
    google: string | null;
    meta: string | null;
  };
}
