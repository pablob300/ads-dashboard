"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import type { GetBudgetResponse } from "@/lib/budget";
import { channelLabel } from "@/lib/budget";
import BudgetRowCard from "@/components/budget/BudgetRowCard";

interface Client {
  id: string;
  name: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

const CHANNEL_ORDER = ["google", "meta"];

export default function BudgetControl({ client }: { client: Client }) {
  const { addToast } = useToast();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [data, setData] = useState<GetBudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/budget?year=${year}&month=${month}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar orçamento");
      const result = json as GetBudgetResponse;
      setData(result);
      setEdited(
        Object.fromEntries(result.rows.map((r) => [r.key, r.budgetAmount != null ? String(r.budgetAmount) : ""]))
      );
      if (result.errors.google) addToast(result.errors.google, "error");
      if (result.errors.meta) addToast(result.errors.meta, "error");
    } catch (err) {
      setData(null);
      addToast(err instanceof Error ? err.message : "Erro ao carregar orçamento.", "error");
    } finally {
      setLoading(false);
    }
  }, [client.id, addToast]);

  useEffect(() => { fetchData(monthValue); }, [monthValue, fetchData]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const [year, month] = monthValue.split("-").map(Number);
      const entries = data.rows.map((r) => ({
        subReportId: r.subReportId,
        channel: r.channel,
        amount: Number(edited[r.key]) || 0,
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

  function toggleExpand(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const channels = data
    ? Array.from(new Set(data.rows.map((r) => r.channel))).sort((a, b) => {
        const ia = CHANNEL_ORDER.indexOf(a);
        const ib = CHANNEL_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
    : [];

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500 text-sm">Controle de Orçamento</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Mês</label>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading || !data || data.rows.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {saving ? "Salvando..." : "Salvar orçamentos"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm">Nenhuma conta Google ou Meta vinculada a este cliente.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total geral</p>
            <p className="text-lg font-bold text-slate-800">
              {fmtBRL(data.totals.overall.spent)}{" "}
              <span className="text-sm font-normal text-slate-400">de {fmtBRL(data.totals.overall.budget)}</span>
            </p>
          </div>

          {channels.map((channel) => (
            <div key={channel} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">{channelLabel(channel)}</h2>
                <p className="text-xs text-slate-500">
                  {fmtBRL(data.totals.byChannel[channel]?.spent ?? 0)} de{" "}
                  {fmtBRL(data.totals.byChannel[channel]?.budget ?? 0)}
                </p>
              </div>
              <div className="space-y-3">
                {data.rows
                  .filter((r) => r.channel === channel)
                  .map((row) => (
                    <BudgetRowCard
                      key={row.key}
                      row={row}
                      value={edited[row.key] ?? ""}
                      onChange={(v) => setEdited((prev) => ({ ...prev, [row.key]: v }))}
                      expanded={expandedRows.has(row.key)}
                      onToggleExpand={() => toggleExpand(row.key)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
