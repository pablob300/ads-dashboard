"use client";

import type { BudgetRow } from "@/lib/budget";
import { CHANNEL_LABELS, channelLabel } from "@/lib/budget";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  row: BudgetRow;
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function BudgetRowCard({ row, value, onChange, expanded, onToggleExpand }: Props) {
  const budget = Number(value) || 0;
  const pct = budget > 0 ? Math.round((row.spent / budget) * 100) : null;
  const barColor = pct === null ? "bg-slate-200" : pct > 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-slate-800 flex-1 min-w-[140px] truncate">{row.name}</p>

        <select
          disabled
          value={row.channel}
          className="h-9 px-2.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50 cursor-not-allowed"
        >
          {Object.keys(CHANNEL_LABELS).includes(row.channel) ? (
            <option value={row.channel}>{channelLabel(row.channel)}</option>
          ) : (
            <option value={row.channel}>{row.channel}</option>
          )}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-400">R$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0,00"
            className="h-9 w-32 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {budget > 0 ? (
        <div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {fmtBRL(row.spent)} de {fmtBRL(budget)} ({pct}%)
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Defina um orçamento para ver o progresso.</p>
      )}

      <button
        type="button"
        onClick={onToggleExpand}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
      >
        {expanded ? "− ocultar detalhes" : "+ detalhes"}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          {row.campaigns.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma campanha com gasto no período.</p>
          ) : (
            row.campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 truncate">{c.name}</span>
                <span className="text-slate-800 font-medium tabular-nums shrink-0">{fmtBRL(c.spend)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
