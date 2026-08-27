"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BudgetEntryRow } from "@/lib/budget";
import BudgetSummaryGrid, { BudgetGridSkeleton } from "@/components/budget/BudgetSummaryGrid";

/**
 * Controle de Orçamento do link compartilhado — somente visualização.
 *
 * É a versão de leitura de `(dashboard)/clients/[id]/budget/budget-control.tsx`:
 * mesmos cards, mesmo seletor de mês, sem o formulário de cadastro/edição e sem
 * nenhuma chamada de escrita. A rota pública que alimenta esta tela também só
 * expõe GET.
 */

/** Só o que esta tela consome — a rota pública não devolve `subReports`/`availableChannels`. */
interface SharedBudgetResponse {
  year: number;
  month: number;
  entries: BudgetEntryRow[];
  errors: { google: string | null; meta: string | null };
}

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export default function SharedBudget({
  clientName,
  token,
}: {
  clientName: string;
  token: string;
}) {
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [entries, setEntries] = useState<BudgetEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}/budget?year=${year}&month=${month}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar orçamento");
      const result = json as SharedBudgetResponse;
      setEntries(result.entries);
      // Sem toast nesta tela: o link compartilhado não monta o ToastProvider, e o
      // cliente não tem o que fazer com um erro de token da API de anúncio.
      // O aviso fica discreto, e os cards que carregaram continuam visíveis.
      const failed = [result.errors.google, result.errors.meta].filter(Boolean);
      if (failed.length > 0) {
        setError("Não foi possível calcular o valor executado de um dos canais. Os valores podem estar incompletos.");
      }
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar orçamento.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(monthValue); }, [monthValue, fetchData]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/share/${token}`} className="text-slate-400 hover:text-slate-600 transition" aria-label="Voltar ao relatório">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{clientName}</h1>
          <p className="text-slate-500 text-sm">Controle de Orçamento</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600" htmlFor="budget-month">Mês</label>
        <input
          id="budget-month"
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {loading ? <BudgetGridSkeleton /> : <BudgetSummaryGrid entries={entries} />}
    </div>
  );
}
