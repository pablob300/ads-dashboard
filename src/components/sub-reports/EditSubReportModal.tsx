"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubReport } from "./CreateSubReportModal";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface CampaignListItem {
  id: string;
  name: string;
  status: string;
}

interface Props {
  clientId: string;
  subReport: SubReport;
  channel: "google" | "meta";
  knownCampaigns?: { id: string; name: string }[];
  onUpdated: (subReport: SubReport) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}

export default function EditSubReportModal({ clientId, subReport, channel, knownCampaigns, onUpdated, onDeleted, onCancel }: Props) {
  const [name, setName] = useState(subReport.name);
  const [allCampaigns, setAllCampaigns] = useState<CampaignListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(subReport.campaignIds));
  const [search, setSearch] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const endpoint = channel === "meta"
      ? `/api/clients/${clientId}/meta-campaigns/all`
      : `/api/clients/${clientId}/campaigns/all`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => setAllCampaigns(data.campaigns ?? []))
      .catch(() => setAllCampaigns([]))
      .finally(() => setLoadingCampaigns(false));
  }, [clientId, channel]);

  // Mescla: allCampaigns tem prioridade (status correto), knownCampaigns é fallback para IDs
  // cujo nome não chegou (API falhou ou token expirado)
  const mergedCampaigns = useMemo(() => {
    const map = new Map<string, CampaignListItem>();
    for (const c of knownCampaigns ?? []) {
      map.set(c.id, { id: c.id, name: c.name, status: "UNKNOWN" });
    }
    for (const c of allCampaigns) {
      map.set(c.id, c);
    }
    return Array.from(map.values());
  }, [allCampaigns, knownCampaigns]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const q = search.toLowerCase();

  // Campanhas já selecionadas — aparecem independente do status
  const selectedInList = mergedCampaigns.filter(
    (c) => selectedIds.has(c.id) && c.name.toLowerCase().includes(q)
  );

  // Campanhas disponíveis para adicionar — somente ativas e não selecionadas
  const addable = mergedCampaigns.filter(
    (c) =>
      !selectedIds.has(c.id) &&
      (c.status === "ENABLED" || c.status === "ACTIVE") &&
      c.name.toLowerCase().includes(q)
  );

  async function handleSave() {
    if (!name.trim()) { setError("Informe um nome."); return; }
    if (selectedIds.size === 0) { setError("Selecione ao menos uma campanha."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/sub-reports/${subReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), campaignIds: Array.from(selectedIds) }),
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
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Editar Sub-relatório</h2>
          </div>

          {/* Scrollable body */}
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Campanhas vinculadas</p>
                <span className="text-xs text-slate-400">{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar campanha..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />

              {loadingCampaigns ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {/* Campanhas já selecionadas — sempre aparecem */}
                  {selectedInList.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selecionadas</p>
                      </div>
                      {selectedInList.map((c) => (
                        <CampaignRow key={c.id} campaign={c} selected={true} onToggle={toggle} />
                      ))}
                    </>
                  )}

                  {/* Campanhas ativas disponíveis para adicionar */}
                  {addable.length > 0 && (
                    <>
                      <div className={`px-3 py-1.5 bg-slate-50 border-b border-slate-100 ${selectedInList.length > 0 ? "border-t border-slate-100" : ""}`}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponíveis</p>
                      </div>
                      {addable.map((c) => (
                        <CampaignRow key={c.id} campaign={c} selected={false} onToggle={toggle} />
                      ))}
                    </>
                  )}

                  {selectedInList.length === 0 && addable.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma campanha encontrada.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
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
                disabled={saving || selectedIds.size === 0}
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

function CampaignRow({
  campaign, selected, onToggle,
}: {
  campaign: CampaignListItem;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(campaign.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 text-left"
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-700 truncate">{campaign.name}</span>
    </button>
  );
}
