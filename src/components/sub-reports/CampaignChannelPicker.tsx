"use client";

import { useEffect, useMemo, useState } from "react";
import { CHANNELS, channelLabel } from "@/lib/channels";

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  /** Seleção atual, por canal. */
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  /**
   * Campanhas que o dashboard-pai já tem carregadas, por canal. Serve de rede de
   * segurança: o pai só conhece o canal da aba ativa, mas garante que uma campanha
   * já vinculada nunca suma da lista se o endpoint /all daquele canal falhar.
   */
  knownCampaignsByChannel?: Record<string, Campaign[]>;
}

export default function CampaignChannelPicker({
  clientId,
  value,
  onChange,
  knownCampaignsByChannel,
}: Props) {
  const [allByChannel, setAllByChannel] = useState<Record<string, Campaign[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHANNELS.map((c) => [c.key, true]))
  );
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  // Busca as campanhas de TODOS os canais — o sub-relatório é comum a eles.
  useEffect(() => {
    let cancelled = false;
    for (const channel of CHANNELS) {
      fetch(channel.allCampaignsPath(clientId))
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data) => {
          if (cancelled) return;
          setAllByChannel((prev) => ({ ...prev, [channel.key]: data.campaigns ?? [] }));
        })
        .catch(() => {
          if (cancelled) return;
          setFailed((prev) => ({ ...prev, [channel.key]: true }));
        })
        .finally(() => {
          if (cancelled) return;
          setLoading((prev) => ({ ...prev, [channel.key]: false }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // União das duas fontes por canal: o /all é a lista completa, o known cobre o
  // caso de ele falhar. Sem isso, o canal da aba inativa ficaria sem opções.
  const mergedByChannel = useMemo(() => {
    const merged: Record<string, Campaign[]> = {};
    for (const channel of CHANNELS) {
      const map = new Map<string, Campaign>();
      for (const c of knownCampaignsByChannel?.[channel.key] ?? []) map.set(c.id, c);
      for (const c of allByChannel[channel.key] ?? []) map.set(c.id, c);
      merged[channel.key] = Array.from(map.values());
    }
    return merged;
  }, [allByChannel, knownCampaignsByChannel]);

  function toggle(channel: string, campaignId: string) {
    const current = new Set(value[channel] ?? []);
    if (current.has(campaignId)) current.delete(campaignId);
    else current.add(campaignId);
    onChange({ ...value, [channel]: Array.from(current) });
  }

  const q = search.toLowerCase();

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar campanha..."
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {CHANNELS.map((channel) => {
        const selectedIds = new Set(value[channel.key] ?? []);
        const campaigns = mergedByChannel[channel.key] ?? [];
        const selected = campaigns.filter((c) => selectedIds.has(c.id) && c.name.toLowerCase().includes(q));
        const available = campaigns.filter((c) => !selectedIds.has(c.id) && c.name.toLowerCase().includes(q));

        return (
          <div key={channel.key}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-display text-sm font-bold text-slate-700">{channelLabel(channel.key)}</h3>
              <span className="text-xs text-slate-400">
                {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </span>
            </div>

            {failed[channel.key] && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-1.5">
                Não foi possível carregar as campanhas do {channelLabel(channel.key)}. As já
                vinculadas continuam selecionadas.
              </p>
            )}

            {loading[channel.key] ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {selected.map((c) => (
                  <CampaignRow key={c.id} campaign={c} selected onToggle={() => toggle(channel.key, c.id)} />
                ))}
                {available.map((c) => (
                  <CampaignRow key={c.id} campaign={c} selected={false} onToggle={() => toggle(channel.key, c.id)} />
                ))}
                {selected.length === 0 && available.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-3">
                    Nenhuma campanha {channelLabel(channel.key)} encontrada.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CampaignRow({
  campaign,
  selected,
  onToggle,
}: {
  campaign: Campaign;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 text-left"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
          selected ? "bg-blue-600 border-blue-600" : "border-slate-300"
        }`}
      >
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
