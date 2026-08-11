"use client";

import { useState } from "react";
import type { SubReport } from "@/lib/sub-reports";
import { totalCampaignCount } from "@/lib/sub-reports";
import CampaignChannelPicker from "./CampaignChannelPicker";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  subReport: SubReport;
  knownCampaignsByChannel?: Record<string, Campaign[]>;
  onUpdated: (subReport: SubReport) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}

export default function EditSubReportModal({
  clientId,
  subReport,
  knownCampaignsByChannel,
  onUpdated,
  onDeleted,
  onCancel,
}: Props) {
  const [name, setName] = useState(subReport.name);
  const [campaignsByChannel, setCampaignsByChannel] = useState<Record<string, string[]>>(
    () => ({ ...subReport.campaignsByChannel })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const total = totalCampaignCount(campaignsByChannel);

  async function handleSave() {
    if (!name.trim()) { setError("Informe um nome."); return; }
    if (total === 0) { setError("Selecione ao menos uma campanha."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-reports/${subReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), campaignsByChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      onUpdated(data.subReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-reports/${subReport.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      onDeleted(subReport.id);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Editar Sub-relatório</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 space-y-3">
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || total === 0}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
            >
              Excluir sub-relatório
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          name={subReport.name}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
