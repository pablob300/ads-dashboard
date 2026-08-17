"use client";

import { useState } from "react";
import type { SubReport } from "@/lib/sub-reports";
import { totalCampaignCount } from "@/lib/sub-reports";
import CampaignChannelPicker from "./CampaignChannelPicker";

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  /** Canal da aba de onde o modal foi aberto — só semeia a seleção inicial. */
  channel: string;
  /** Campanhas já selecionadas naquela aba, usadas como seleção inicial. */
  campaigns: Campaign[];
  knownCampaignsByChannel?: Record<string, Campaign[]>;
  /** Canais com conta vinculada no cliente. Default do picker: todos. */
  channels?: string[];
  onCreated: (subReport: SubReport) => void;
  onCancel: () => void;
}

export default function CreateSubReportModal({
  clientId,
  channel,
  campaigns,
  knownCampaignsByChannel,
  channels,
  onCreated,
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [campaignsByChannel, setCampaignsByChannel] = useState<Record<string, string[]>>({
    [channel]: campaigns.map((c) => c.id),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = totalCampaignCount(campaignsByChannel);

  async function handleCreate() {
    if (!name.trim()) { setError("Informe um nome para o sub-relatório."); return; }
    if (total === 0) { setError("Selecione ao menos uma campanha."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), campaignsByChannel }),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Gerar Sub-relatório</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Um sub-relatório é comum aos canais — vincule campanhas de Google e de Meta ao mesmo nome.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
              placeholder="Ex: Campanhas de Conversão"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Campanhas vinculadas <span className="text-slate-400">({total})</span>
            </p>
            <CampaignChannelPicker
              clientId={clientId}
              value={campaignsByChannel}
              onChange={setCampaignsByChannel}
              knownCampaignsByChannel={knownCampaignsByChannel}
              channels={channels}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || total === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Criando..." : "Criar Sub-relatório"}
          </button>
        </div>
      </div>
    </div>
  );
}
