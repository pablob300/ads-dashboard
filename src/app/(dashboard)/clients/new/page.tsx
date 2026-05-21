"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

interface GoogleAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  isManagerAccount: boolean;
  connectionId: string;
  googleEmail: string;
}

interface MetaAccount {
  accountId: string;
  name: string;
  currency: string;
  timezone: string;
  connectionId: string;
  metaEmail: string | null;
  metaName: string | null;
}

export default function NewClientPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [selectedGoogle, setSelectedGoogle] = useState<Set<string>>(new Set());
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [googleError, setGoogleError] = useState("");

  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<Set<string>>(new Set());
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/google-ads/accounts")
      .then((r) => r.json())
      .then((data) => {
        setGoogleAccounts(data.accounts ?? []);
        if ((data.accounts ?? []).length === 0) setGoogleError("Nenhuma conta encontrada. Conecte sua conta Google Ads primeiro.");
      })
      .catch(() => setGoogleError("Erro ao buscar contas Google. Tente recarregar."))
      .finally(() => setLoadingGoogle(false));

    fetch("/api/meta-ads/accounts")
      .then((r) => r.json())
      .then((data) => setMetaAccounts(data.accounts ?? []))
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, []);

  function toggleGoogle(id: string) {
    setSelectedGoogle((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleMeta(id: string) {
    setSelectedMeta((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedGoogle.size === 0 && selectedMeta.size === 0) {
      setError("Selecione ao menos uma conta de anúncio (Google Ads ou Meta Ads).");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        notes,
        googleAccounts: googleAccounts.filter((a) => selectedGoogle.has(a.customerId)),
        metaAccounts: metaAccounts.filter((a) => selectedMeta.has(a.accountId)),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      const msg = data.error ?? "Erro ao criar cliente.";
      setError(msg);
      addToast(msg, "error");
    } else {
      addToast("Cliente criado com sucesso!", "success");
      router.push("/clients");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Novo Cliente</h1>
        <p className="text-slate-500 text-sm mt-1">Crie um cliente e vincule as contas de anúncio.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Dados do cliente */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Dados do cliente</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome do cliente <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              required minLength={2} placeholder="Ex: Empresa XYZ"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Opcional"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* Contas Google Ads */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                <path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Contas Google Ads</h2>
            </div>
            {selectedGoogle.size > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-full">
                {selectedGoogle.size} selecionada{selectedGoogle.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">Opcional. Você pode adicionar contas depois na edição do cliente.</p>

          {loadingGoogle ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : googleError ? (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">{googleError}</div>
          ) : googleAccounts.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
              Nenhuma conta encontrada.{" "}
              <a href="/integrations/google" className="text-blue-600 hover:underline">Conectar Google Ads</a>
            </div>
          ) : (
            <div className="space-y-2">
              {googleAccounts.map((account) => {
                const selected = selectedGoogle.has(account.customerId);
                return (
                  <button key={account.customerId} type="button" onClick={() => toggleGoogle(account.customerId)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{account.descriptiveName}</p>
                        {account.isManagerAccount && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium shrink-0">MCC</span>}
                      </div>
                      <p className="text-xs text-slate-400">ID: {account.customerId} · {account.googleEmail}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Contas Meta Ads */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Contas Meta Ads</h2>
            </div>
            {selectedMeta.size > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-full">
                {selectedMeta.size} selecionada{selectedMeta.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">Opcional. Você pode adicionar contas depois na edição do cliente.</p>

          {loadingMeta ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : metaAccounts.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
              Nenhuma conta encontrada.{" "}
              <a href="/integrations/meta" className="text-blue-600 hover:underline">Conectar Meta Ads</a>
            </div>
          ) : (
            <div className="space-y-2">
              {metaAccounts.map((account) => {
                const selected = selectedMeta.has(account.accountId);
                return (
                  <button key={account.accountId} type="button" onClick={() => toggleMeta(account.accountId)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition ${selected ? "border-[#1877F2] bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${selected ? "bg-[#1877F2] border-[#1877F2]" : "border-slate-300"}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{account.name}</p>
                      <p className="text-xs text-slate-400">ID: {account.accountId} · {account.metaEmail ?? account.metaName ?? "Meta"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button type="submit" disabled={submitting || (loadingGoogle && loadingMeta)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {submitting ? "Criando..." : "Criar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
