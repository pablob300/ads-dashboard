"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import type { BudgetEntryRow, GetBudgetResponse } from "@/lib/budget";
import { TOTAL_SENTINEL, channelLabel } from "@/lib/budget";
import BudgetSummaryCard from "@/components/budget/BudgetSummaryCard";

interface Client {
  id: string;
  name: string;
}

/** Ordem das colunas de canal; canais desconhecidos vão para o fim, em ordem alfabética. */
const CHANNEL_ORDER = ["google", "meta"];

interface ChannelGroup {
  channel: string;
  entries: BudgetEntryRow[];
}

function groupByChannel(entries: BudgetEntryRow[]): ChannelGroup[] {
  const byChannel = new Map<string, BudgetEntryRow[]>();
  for (const entry of entries) {
    const list = byChannel.get(entry.channel);
    if (list) list.push(entry);
    else byChannel.set(entry.channel, [entry]);
  }
  const rank = (c: string) => {
    const i = CHANNEL_ORDER.indexOf(c);
    return i === -1 ? CHANNEL_ORDER.length : i;
  };
  return Array.from(byChannel.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([channel, items]) => ({ channel, entries: items }));
}

interface FormRow {
  key: string;
  subReportName: string; // "" = não escolhido, TOTAL_SENTINEL, ou nome real
  channel: string;       // "" = não escolhido
  amount: string;
}

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function newRow(): FormRow {
  return { key: crypto.randomUUID(), subReportName: "", channel: "", amount: "" };
}

export default function BudgetControl({ client }: { client: Client }) {
  const { addToast } = useToast();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [data, setData] = useState<GetBudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<FormRow[]>([]);

  const fetchData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/budget?year=${year}&month=${month}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar orçamento");
      const result = json as GetBudgetResponse;
      setData(result);
      setRows(
        result.entries.map((e) => ({
          key: crypto.randomUUID(),
          subReportName: e.subReportId
            ? result.subReports.find((sr) => sr.id === e.subReportId)?.name ?? ""
            : TOTAL_SENTINEL,
          channel: e.channel,
          amount: String(e.budgetAmount),
        }))
      );
      if (result.errors.google) addToast(result.errors.google, "error");
      if (result.errors.meta) addToast(result.errors.meta, "error");
    } catch (err) {
      setData(null);
      setRows([]);
      addToast(err instanceof Error ? err.message : "Erro ao carregar orçamento.", "error");
    } finally {
      setLoading(false);
    }
  }, [client.id, addToast]);

  useEffect(() => { fetchData(monthValue); }, [monthValue, fetchData]);

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }
  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }
  function updateRow(key: string, patch: Partial<FormRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function channelsForName(name: string): string[] {
    if (!data || !name) return [];
    if (name === TOTAL_SENTINEL) return data.availableChannels;
    return data.subReports.filter((sr) => sr.name === name).map((sr) => sr.channel);
  }

  function resolveSubReportId(name: string, channel: string): string | null {
    if (!data || !name || name === TOTAL_SENTINEL) return null;
    return data.subReports.find((sr) => sr.name === name && sr.channel === channel)?.id ?? null;
  }

  function dupKey(row: FormRow): string | null {
    if (!row.subReportName || !row.channel) return null;
    const subReportId = resolveSubReportId(row.subReportName, row.channel);
    return `${subReportId ?? "total"}:${row.channel}`;
  }

  const duplicateKeys = (() => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const row of rows) {
      const k = dupKey(row);
      if (!k) continue;
      if (seen.has(k)) dups.add(row.key);
      else seen.add(k);
    }
    return dups;
  })();

  const hasIncomplete = rows.some((r) => !r.subReportName || !r.channel || !r.amount);
  const canSave = rows.length > 0 && duplicateKeys.size === 0 && !hasIncomplete;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const [year, month] = monthValue.split("-").map(Number);
      const entries = rows.map((r) => ({
        subReportId: resolveSubReportId(r.subReportName, r.channel),
        channel: r.channel,
        amount: Number(r.amount) || 0,
      }));
      const res = await fetch(`/api/clients/${client.id}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, entries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar");
      addToast("Orçamentos salvos com sucesso.", "success");
      fetchData(monthValue);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  const subReportNames = data ? Array.from(new Set(data.subReports.map((sr) => sr.name))) : [];

  const channelGroups = data ? groupByChannel(data.entries) : [];
  // Com dois ou mais canais, cada um vira uma coluna (lg+) e os cards ficam 2 por linha
  // dentro dela. Com um canal só, ele ocupa a largura toda e cabem 3 cards por linha.
  const multiChannel = channelGroups.length > 1;
  const groupsGridClass = multiChannel ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1";
  const cardsGridClass = multiChannel
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500 text-sm">Controle de Orçamento</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Mês</label>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {/* Cards de resumo, agrupados por canal */}
      {loading ? (
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
      ) : channelGroups.length > 0 ? (
        <div className={`grid gap-x-6 gap-y-8 ${groupsGridClass}`}>
          {channelGroups.map((group) => (
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
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum orçamento cadastrado para este mês ainda.</p>
        </div>
      )}

      {/* Cadastro / edição */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-700">Cadastrar / editar orçamentos</h2>
          <button
            type="button"
            onClick={addRow}
            disabled={!data}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition text-lg font-bold leading-none"
            aria-label="Adicionar orçamento"
          >
            +
          </button>
        </div>

        {rows.length === 0 && (
          <p className="text-xs text-slate-400">Clique em + para adicionar um orçamento.</p>
        )}

        <div className="space-y-2">
          {rows.map((row) => {
            const isDup = duplicateKeys.has(row.key);
            return (
              <div
                key={row.key}
                className={`flex flex-wrap items-center gap-2 p-2 rounded-lg transition ${
                  isDup ? "bg-red-50 border border-red-300" : ""
                }`}
              >
                <select
                  value={row.subReportName}
                  onChange={(e) => updateRow(row.key, { subReportName: e.target.value, channel: "" })}
                  className="h-9 px-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[160px]"
                >
                  <option value="">Sub-relatório...</option>
                  {subReportNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  <option value={TOTAL_SENTINEL}>Total (sem sub-relatório)</option>
                </select>

                <select
                  value={row.channel}
                  onChange={(e) => updateRow(row.key, { channel: e.target.value })}
                  disabled={!row.subReportName}
                  className="h-9 px-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 min-w-[110px]"
                >
                  <option value="">Canal...</option>
                  {channelsForName(row.subReportName).map((c) => (
                    <option key={c} value={c}>{channelLabel(c)}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    placeholder="0,00"
                    className="h-9 w-32 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                {isDup && (
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    Duplicado
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="ml-auto text-slate-400 hover:text-red-600 transition text-sm px-1.5"
                  aria-label="Remover linha"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {duplicateKeys.size > 0 && (
          <p className="text-xs text-red-600">
            Existem sub-relatório + canal duplicados. Corrija antes de salvar.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {saving ? "Salvando..." : "Salvar orçamentos"}
        </button>
      </div>
    </div>
  );
}
