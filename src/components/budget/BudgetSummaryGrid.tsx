"use client";

import type { BudgetEntryRow } from "@/lib/budget";
import { channelLabel } from "@/lib/budget";
import BudgetSummaryCard from "./BudgetSummaryCard";
import { CHANNEL_KEYS } from "@/lib/channels";

/**
 * Cards de orçamento agrupados por canal.
 *
 * Extraído de `budget-control.tsx` quando o link compartilhado passou a mostrar o
 * Controle de Orçamento: é a parte puramente de leitura, comum às duas telas. O
 * formulário de cadastro continua só na versão interna.
 */

interface ChannelGroup {
  channel: string;
  entries: BudgetEntryRow[];
}

/** Ordem canônica dos canais; canal desconhecido vai para o fim, em ordem alfabética. */
function groupByChannel(entries: BudgetEntryRow[]): ChannelGroup[] {
  const byChannel = new Map<string, BudgetEntryRow[]>();
  for (const entry of entries) {
    const list = byChannel.get(entry.channel);
    if (list) list.push(entry);
    else byChannel.set(entry.channel, [entry]);
  }
  const rank = (c: string) => {
    const i = CHANNEL_KEYS.indexOf(c);
    return i === -1 ? CHANNEL_KEYS.length : i;
  };
  return Array.from(byChannel.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([channel, items]) => ({ channel, entries: items }));
}

export function BudgetGridSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-8">
      {[1, 2].map((col) => (
        <div key={col} className="space-y-3">
          <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BudgetSummaryGrid({
  entries,
  emptyMessage = "Nenhum orçamento cadastrado para este mês ainda.",
}: {
  entries: BudgetEntryRow[];
  emptyMessage?: string;
}) {
  const groups = groupByChannel(entries);

  if (groups.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
        <p className="text-slate-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Com dois ou mais canais, cada um vira uma coluna (lg+) e os cards ficam 2 por linha
  // dentro dela. Com um canal só, ele ocupa a largura toda e cabem 3 cards por linha.
  const multiChannel = groups.length > 1;
  const groupsGridClass = multiChannel ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1";
  const cardsGridClass = multiChannel
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-x-6 gap-y-8 ${groupsGridClass}`}>
      {groups.map((group) => (
        <section key={group.channel} className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate-900 pb-2 border-b border-slate-200">
            {channelLabel(group.channel)}
          </h2>
          <div className={`grid gap-4 ${cardsGridClass}`}>
            {group.entries.map((e) => (
              <BudgetSummaryCard
                key={`${e.subReportId ?? "total"}:${e.channel}`}
                name={e.name}
                channel={e.channel}
                budget={e.budgetAmount}
                spent={e.spent}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
