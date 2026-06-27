"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Log {
  id: string;
  clientName: string | null;
  accountId: string | null;
  accountName: string | null;
  rawResponse: Record<string, unknown> | null;
  parsedValue: number | null;
  httpStatus: number | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: number | null }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const ok = status === 200;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {status}
    </span>
  );
}

function RawJson({ data }: { data: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!data) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-blue-600 hover:underline"
      >
        {open ? "Fechar" : "Ver JSON"}
      </button>
      {open && (
        <pre className="mt-2 bg-slate-950 text-green-400 text-xs rounded-lg p-3 overflow-x-auto max-w-lg max-h-64 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function MetaBalanceClient({ logs }: { logs: Log[] }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    if (!confirm("Limpar todos os logs de Meta Balance?")) return;
    setClearing(true);
    await fetch("/api/debug/logs?endpoint=meta-balance", { method: "DELETE" });
    setClearing(false);
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Debug — Meta Balance</h1>
          <p className="text-slate-500 text-sm mt-1">
            Histórico das chamadas à API do Meta para busca de saldo. Última chamada aparece primeiro.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button
            onClick={handleClear}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {clearing ? "Limpando..." : "Limpar Logs"}
          </button>
        </div>
      </div>

      {/* Contador */}
      <div className="mb-4 flex items-center gap-2">
        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">
          {logs.length} registro{logs.length !== 1 ? "s" : ""}
        </span>
        {logs.length === 100 && (
          <span className="text-xs text-slate-400">Mostrando os 100 mais recentes</span>
        )}
      </div>

      {/* Tabela */}
      {logs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm">Nenhum log ainda.</p>
          <p className="text-slate-400 text-xs mt-1">
            Abra o tooltip (i) de saldo de um cliente com Meta Ads para registrar a primeira chamada.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Horário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">balance (API)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor exibido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const rawBalance = log.rawResponse?.balance as string | undefined;
                const currency = log.rawResponse?.currency as string | undefined;
                const dt = new Date(log.createdAt);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <div>{dt.toLocaleDateString("pt-BR")}</div>
                      <div className="text-xs text-slate-400">{dt.toLocaleTimeString("pt-BR")}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{log.clientName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{log.accountName ?? "—"}</div>
                      <div className="text-xs text-slate-400">{log.accountId ?? ""}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.httpStatus} /></td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {rawBalance != null ? (
                        <span>
                          {rawBalance}
                          {currency && <span className="text-slate-400 text-xs ml-1">{currency}</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.parsedValue != null ? (
                        <span className="font-semibold text-slate-900">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(log.parsedValue)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><RawJson data={log.rawResponse} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
