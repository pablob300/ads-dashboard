/**
 * Definição das colunas da tabela "Campanhas no período" — compartilhada pelas
 * quatro tabelas do app (Google e Meta, versão interna e versão do link público).
 *
 * A ordem das colunas é um array de ids persistido no `localStorage` do navegador,
 * separado por canal. A coluna "Campanha" não entra nesse array: ela é fixa na
 * primeira posição.
 */

import type { CampaignMetric } from "./google-ads-campaigns";
import type { MetaCampaignMetric } from "./meta-ads-campaigns";

// ── formatadores ─────────────────────────────────────────────────────────────
export function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
export function fmtNum(v: number) { return v.toLocaleString("pt-BR"); }
export function fmtPct(v: number) { return v.toFixed(2) + "%"; }

// ── shape normalizado ────────────────────────────────────────────────────────
/**
 * Linha da tabela já normalizada. Existe porque o Google chama o investimento de
 * `costBRL` e o Meta de `spend`, e só o Meta tem `resultType` — a tabela não
 * precisa saber de qual canal veio o dado.
 */
export interface CampaignRow {
  id: string;
  name: string;
  /** Rótulo do tipo de resultado (só Meta), exibido abaixo do nome. */
  subLabel?: string;
  cost: number;
  impressions: number;
  clicks: number;
  /** Já em pontos percentuais (ex: 2.35 = 2,35%). */
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
}

export interface CampaignTotals {
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
}

// ── adaptadores ──────────────────────────────────────────────────────────────
// CPC e custo por resultado são sempre derivados aqui, nunca lidos do campo que a
// API devolve: é o que mantém a linha e o TOTAL usando a mesma fórmula. O Google
// nem sequer tem `cpc` no seu CampaignMetric.
const cpcOf = (cost: number, clicks: number) => (clicks > 0 ? cost / clicks : 0);
const cprOf = (cost: number, conversions: number) => (conversions > 0 ? cost / conversions : 0);

export function rowsFromGoogle(campaigns: CampaignMetric[]): CampaignRow[] {
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    cost: c.costBRL,
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    cpc: cpcOf(c.costBRL, c.clicks),
    conversions: c.conversions,
    costPerConversion: cprOf(c.costBRL, c.conversions),
  }));
}

export function rowsFromMeta(campaigns: MetaCampaignMetric[]): CampaignRow[] {
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    subLabel: c.resultType,
    cost: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    cpc: cpcOf(c.spend, c.clicks),
    conversions: c.conversions,
    costPerConversion: cprOf(c.spend, c.conversions),
  }));
}

interface GoogleTotalsInput { costBRL: number; impressions: number; clicks: number; conversions: number; ctr: number }
interface MetaTotalsInput   { spend: number;   impressions: number; clicks: number; conversions: number; ctr: number }

export function totalsFromGoogle(t: GoogleTotalsInput): CampaignTotals {
  return {
    cost: t.costBRL,
    impressions: t.impressions,
    clicks: t.clicks,
    ctr: t.ctr,
    cpc: cpcOf(t.costBRL, t.clicks),
    conversions: t.conversions,
    costPerConversion: cprOf(t.costBRL, t.conversions),
  };
}

export function totalsFromMeta(t: MetaTotalsInput): CampaignTotals {
  return {
    cost: t.spend,
    impressions: t.impressions,
    clicks: t.clicks,
    ctr: t.ctr,
    cpc: cpcOf(t.spend, t.clicks),
    conversions: t.conversions,
    costPerConversion: cprOf(t.spend, t.conversions),
  };
}

// ── registro de colunas ──────────────────────────────────────────────────────
interface ColumnDef {
  label: string;
  /** Nome por extenso, vai no `title=` do cabeçalho quando o rótulo é abreviado. */
  title?: string;
  cell: (r: CampaignRow) => string;
  total: (t: CampaignTotals) => string;
}

const COLUMNS = {
  cost: {
    label: "Valor Investido",
    cell: (r) => fmtBRL(r.cost),
    total: (t) => fmtBRL(t.cost),
  },
  impressions: {
    label: "Impressões",
    cell: (r) => fmtNum(r.impressions),
    total: (t) => fmtNum(t.impressions),
  },
  clicks: {
    label: "Cliques",
    cell: (r) => fmtNum(r.clicks),
    total: (t) => fmtNum(t.clicks),
  },
  ctr: {
    label: "CTR",
    title: "Taxa de cliques (cliques ÷ impressões)",
    cell: (r) => fmtPct(r.ctr),
    total: (t) => fmtPct(t.ctr),
  },
  cpc: {
    label: "CPC",
    title: "Custo por clique (valor investido ÷ cliques)",
    cell: (r) => (r.clicks > 0 ? fmtBRL(r.cpc) : "—"),
    total: (t) => (t.clicks > 0 ? fmtBRL(t.cpc) : "—"),
  },
  conversions: {
    label: "Resultados",
    cell: (r) => fmtNum(r.conversions),
    total: (t) => fmtNum(t.conversions),
  },
  costPerConversion: {
    label: "Custo/Result.",
    title: "Custo por resultado (valor investido ÷ resultados)",
    cell: (r) => (r.conversions > 0 ? fmtBRL(r.costPerConversion) : "—"),
    total: (t) => (t.conversions > 0 ? fmtBRL(t.costPerConversion) : "—"),
  },
} satisfies Record<string, ColumnDef>;

export type ColumnId = keyof typeof COLUMNS;

// Reexportado com o tipo alargado para `ColumnDef`: sem isso, `CAMPAIGN_COLUMNS[id]`
// vira uma união de objetos e `.title` não existe nos que não declaram o campo.
export const CAMPAIGN_COLUMNS: Record<ColumnId, ColumnDef> = COLUMNS;

export const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "cost",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "conversions",
  "costPerConversion",
];

export type Channel = "google" | "meta";

// ── persistência ─────────────────────────────────────────────────────────────
const storageKey = (channel: Channel) => `b300:campaign-columns:${channel}`;

export function isColumnId(v: unknown): v is ColumnId {
  return typeof v === "string" && v in CAMPAIGN_COLUMNS;
}

/**
 * Lê a ordem salva, descartando ids desconhecidos e acrescentando ao final os que
 * faltarem. Sem essa reconciliação, uma coluna nova ficaria invisível para quem já
 * tem uma ordem gravada. Só roda no cliente — chame de dentro de um `useEffect`.
 */
export function loadColumnOrder(channel: Channel): ColumnId[] {
  try {
    const raw = window.localStorage.getItem(storageKey(channel));
    if (!raw) return [...DEFAULT_COLUMN_ORDER];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMN_ORDER];
    const known = parsed.filter(isColumnId);
    const seen = new Set(known);
    return [...known, ...DEFAULT_COLUMN_ORDER.filter((id) => !seen.has(id))];
  } catch {
    // localStorage indisponível (aba anônima, cookies bloqueados) ou JSON inválido.
    return [...DEFAULT_COLUMN_ORDER];
  }
}

function saveColumnOrder(channel: Channel, order: ColumnId[]) {
  try {
    window.localStorage.setItem(storageKey(channel), JSON.stringify(order));
  } catch {
    // Sem persistência disponível: a ordem vale só para esta sessão.
  }
}

// ── store para `useSyncExternalStore` ────────────────────────────────────────
// A ordem mora fora do React porque a origem dela é o localStorage. Ler no render
// quebraria a hidratação e ler num `useEffect` obrigaria a um setState em cascata;
// `useSyncExternalStore` resolve os dois: serve DEFAULT_COLUMN_ORDER no SSR e troca
// pela ordem salva assim que hidrata. De brinde, duas tabelas do mesmo canal na
// mesma tela ficam sincronizadas.

const listeners = new Set<() => void>();
/** Cache do snapshot: `getSnapshot` precisa devolver a mesma referência entre renders. */
const snapshots = new Map<Channel, ColumnId[]>();

export function subscribeColumnOrder(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function getColumnOrder(channel: Channel): ColumnId[] {
  let current = snapshots.get(channel);
  if (!current) {
    current = loadColumnOrder(channel);
    snapshots.set(channel, current);
  }
  return current;
}

export function getServerColumnOrder(): ColumnId[] {
  return DEFAULT_COLUMN_ORDER;
}

export function setColumnOrder(channel: Channel, order: ColumnId[]) {
  snapshots.set(channel, order);
  saveColumnOrder(channel, order);
  for (const listener of listeners) listener();
}

export function isDefaultOrder(order: ColumnId[]) {
  return (
    order.length === DEFAULT_COLUMN_ORDER.length &&
    order.every((id, i) => id === DEFAULT_COLUMN_ORDER[i])
  );
}

/** Move `id` para o índice `to`, preservando o resto da ordem. */
export function moveColumn(order: ColumnId[], id: ColumnId, to: number): ColumnId[] {
  const from = order.indexOf(id);
  if (from === -1 || to < 0 || to >= order.length || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
