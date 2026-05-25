"use client";

import { useState } from "react";

export interface SubReport {
  id: string;
  clientId: string;
  channel: string;
  name: string;
  campaignIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  channel: string;
  campaigns: Campaign[];
  onCreated: (subReport: SubReport) => void;
  onCancel: () => void;
}

export default function CreateSubReportModal({ clientId, channel, campaigns, onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Informe um nome para o sub-relatório."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), channel, campaignIds: campaigns.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar");
      onCreated(data.subReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar sub-relatório.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Gerar Sub-relatório</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Salva a seleção atual de campanhas como um filtro reutilizável.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome do sub-relatório</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Ex: Campanhas de Conversão"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Campanhas incluídas ({campaigns.length})
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-slate-700 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Criando..." : "Criar Sub-relatório"}
          </button>
        </div>
      </div>
    </div>
  );
}
