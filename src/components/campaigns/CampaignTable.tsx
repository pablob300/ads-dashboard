"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CAMPAIGN_COLUMNS,
  DEFAULT_COLUMN_ORDER,
  getColumnOrder,
  getServerColumnOrder,
  isColumnId,
  isDefaultOrder,
  moveColumn,
  setColumnOrder,
  subscribeColumnOrder,
  totalsFromRows,
  type CampaignRow,
  type Channel,
  type ColumnId,
} from "@/lib/campaign-columns";

interface Props {
  /** Título do card, ex: "Campanhas com impressões no período". */
  title: string;
  /** Já filtradas e ordenadas pelos adaptadores de `campaign-columns`. */
  rows: CampaignRow[];
  /** Define em qual chave do localStorage a ordem das colunas é guardada. */
  channel: Channel;
  /** Nome do sub-relatório ativo, exibido como chip ao lado do título. */
  badge?: string;
}

const TH_BASE = "px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap";

/**
 * Tabela de campanhas com colunas reordenáveis por arrastar o cabeçalho.
 *
 * A coluna "Campanha" é fixa na primeira posição; as demais vivem no array
 * `order`, persistido por canal no navegador de quem está vendo — tanto na versão
 * interna quanto no link compartilhado com o cliente.
 */
export default function CampaignTable({ title, rows, channel, badge }: Props) {
  const totals = useMemo(() => totalsFromRows(rows), [rows]);

  // No SSR e no primeiro render do cliente vale a ordem padrão; a ordem salva no
  // navegador entra assim que hidrata. Ver o store em `@/lib/campaign-columns`.
  const order = useSyncExternalStore(
    subscribeColumnOrder,
    () => getColumnOrder(channel),
    getServerColumnOrder
  );
  const [dragging, setDragging] = useState<ColumnId | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);

  function apply(next: ColumnId[]) {
    if (next === order) return;
    setColumnOrder(channel, next);
  }

  function resetOrder() {
    setColumnOrder(channel, [...DEFAULT_COLUMN_ORDER]);
  }

  /** Move uma coluna uma posição para a esquerda/direita (fallback de toque). */
  function nudge(id: ColumnId, delta: -1 | 1) {
    apply(moveColumn(order, id, order.indexOf(id) + delta));
  }

  function handleDrop(e: React.DragEvent, target: ColumnId) {
    // A coluna de origem vem do dataTransfer, não do state: `dragging` é só o
    // realce visual e pode estar defasado no closure deste handler.
    const source = e.dataTransfer.getData("text/plain");
    if (isColumnId(source) && source !== target) {
      apply(moveColumn(order, source, order.indexOf(target)));
    }
    setDragging(null);
    setDropTarget(null);
  }

  /**
   * De que lado desenhar a marca de destino. Soltando da esquerda para a direita a
   * coluna entra depois do alvo; no sentido inverso, antes dele.
   */
  function dropSide(id: ColumnId): "left" | "right" | null {
    if (!dragging || dropTarget !== id || dragging === id) return null;
    return order.indexOf(dragging) < order.indexOf(id) ? "right" : "left";
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <h2 className="font-semibold text-slate-800 text-sm">
          {title}
          <span className="ml-2 text-slate-400 font-normal">({rows.length})</span>
        </h2>
        {badge && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>
        )}
        {!isDefaultOrder(order) && (
          <button
            type="button"
            onClick={resetOrder}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
          >
            Restaurar ordem padrão
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className={TH_BASE}>Campanha</th>
              {order.map((id, i) => {
                const col = CAMPAIGN_COLUMNS[id];
                const side = dropSide(id);
                return (
                  <th
                    key={id}
                    draggable
                    title={col.title}
                    onDragStart={(e) => {
                      setDragging(id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", id); // exigido pelo Firefox
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget(id); }}
                    onDragLeave={() => setDropTarget((t) => (t === id ? null : t))}
                    onDrop={(e) => { e.preventDefault(); handleDrop(e, id); }}
                    onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                    className={[
                      "group", TH_BASE, "select-none cursor-grab active:cursor-grabbing",
                      dragging === id ? "opacity-40" : "",
                      side === "left" ? "border-l-2 border-l-blue-500" : "",
                      side === "right" ? "border-r-2 border-r-blue-500" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <span className="inline-flex items-center gap-1">
                      <svg viewBox="0 0 24 24" aria-hidden fill="currentColor"
                        className="w-3 h-3 shrink-0 text-slate-300 opacity-0 sm:group-hover:opacity-100 transition">
                        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                      </svg>
                      {col.label}
                      {/* Fallback de toque: o drag-and-drop nativo do HTML não funciona em tela sensível ao toque. */}
                      <span className="inline-flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                        <button
                          type="button" draggable={false} disabled={i === 0}
                          aria-label={`Mover ${col.label} para a esquerda`}
                          onClick={() => nudge(id, -1)}
                          className="px-0.5 leading-none text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400"
                        >
                          &lsaquo;
                        </button>
                        <button
                          type="button" draggable={false} disabled={i === order.length - 1}
                          aria-label={`Mover ${col.label} para a direita`}
                          onClick={() => nudge(id, 1)}
                          className="px-0.5 leading-none text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:hover:text-slate-400"
                        >
                          &rsaquo;
                        </button>
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={order.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nenhuma campanha selecionada
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px]">
                    <span className="block truncate">{r.name}</span>
                    {r.subLabel && (
                      <span className="block text-xs font-normal text-slate-400 truncate">↳ {r.subLabel}</span>
                    )}
                  </td>
                  {order.map((id) => (
                    <td key={id} className="px-4 py-3 text-slate-700 tabular-nums">
                      {CAMPAIGN_COLUMNS[id].cell(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-3 text-xs font-semibold text-slate-600">TOTAL</td>
                {order.map((id) => (
                  <td key={id} className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">
                    {CAMPAIGN_COLUMNS[id].total(totals)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
