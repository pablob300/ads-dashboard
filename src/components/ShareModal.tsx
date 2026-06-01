"use client";

import { useEffect, useState } from "react";

interface ShareLink {
  id: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  token: string;
}

interface Props {
  clientId: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "Sem prazo", value: "" },
  { label: "7 dias",    value: "7"  },
  { label: "30 dias",   value: "30" },
  { label: "90 dias",   value: "90" },
];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ShareModal({ clientId, onClose }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch(`/api/clients/${clientId}/share`)
      .then((r) => r.json())
      .then((d) => setLinks(d.shareLinks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const expiresAt = expiry ? addDays(Number(expiry)) : undefined;
      const res = await fetch(`/api/clients/${clientId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined, expiresAt }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinks((prev) => [data.shareLink, ...prev]);
        setLabel("");
        setExpiry("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await fetch(`/api/clients/${clientId}/share/${id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setRevokingId(null);
    }
  }

  function copyLink(link: ShareLink) {
    const url = `${baseUrl}/share/${link.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Compartilhar dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gere um link público de visualização sem login.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Gerar novo link */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Gerar novo link</p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Identificação (ex: Cliente ABC)"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiry(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${
                    expiry === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {creating ? "Gerando..." : "Gerar link"}
            </button>
          </div>

          {/* Links existentes */}
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : links.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Links ativos ({links.length})</p>
              {links.map((link) => {
                const url = `${baseUrl}/share/${link.token}`;
                const expired = link.expiresAt && new Date(link.expiresAt) < new Date();
                return (
                  <div key={link.id} className={`border rounded-xl p-3 space-y-2 ${expired ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{link.label || "Sem identificação"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Criado em {fmtDate(link.createdAt)}
                          {link.expiresAt && (
                            <span className={expired ? " · Expirado em" : " · Expira em"}>
                              {" "}{fmtDate(link.expiresAt)}
                            </span>
                          )}
                          {!link.expiresAt && " · Sem prazo"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(link.id)}
                        disabled={revokingId === link.id}
                        className="shrink-0 text-xs text-red-500 hover:text-red-700 font-medium transition disabled:opacity-50"
                      >
                        {revokingId === link.id ? "..." : "Revogar"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={url}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all truncate"
                      />
                      <button
                        onClick={() => copyLink(link)}
                        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                          copiedId === link.id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        {copiedId === link.id ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum link criado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
