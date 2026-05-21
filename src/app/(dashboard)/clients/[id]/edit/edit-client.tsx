"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCustomerId } from "@/lib/google-ads";
import { useToast } from "@/components/toast";

interface GoogleAdAccount {
  id: string;
  customerId: string;
  descriptiveName: string;
  alias: string | null;
  isManagerAccount: boolean;
}

interface MetaAdAccount {
  id: string;
  accountId: string;
  name: string;
  alias: string | null;
}

interface Client {
  id: string;
  name: string;
  notes: string | null;
  googleAdAccounts: GoogleAdAccount[];
  metaAdAccounts: MetaAdAccount[];
}

interface AvailableGoogleAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  isManagerAccount: boolean;
  connectionId: string;
  googleEmail: string;
}

interface AvailableMetaAccount {
  accountId: string;
  name: string;
  currency: string;
  timezone: string;
  connectionId: string;
  metaEmail: string | null;
  metaName: string | null;
}

export default function EditClientClient({ client }: { client: Client }) {
  const { addToast } = useToast();
  const router = useRouter();

  // Alias state for existing linked accounts
  const [googleAliases, setGoogleAliases] = useState<Record<string, string>>(
    Object.fromEntries(client.googleAdAccounts.map((a) => [a.id, a.alias ?? ""]))
  );
  const [metaAliases, setMetaAliases] = useState<Record<string, string>>(
    Object.fromEntries(client.metaAdAccounts.map((a) => [a.id, a.alias ?? ""]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Available accounts (not yet linked)
  const [availableGoogle, setAvailableGoogle] = useState<AvailableGoogleAccount[]>([]);
  const [availableMeta, setAvailableMeta] = useState<AvailableMetaAccount[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);

  // Selection for adding new accounts
  const [selectedGoogle, setSelectedGoogle] = useState<Set<string>>(new Set());
  const [selectedMeta, setSelectedMeta] = useState<Set<string>>(new Set());
  const [addingGoogle, setAddingGoogle] = useState(false);
  const [addingMeta, setAddingMeta] = useState(false);

  useEffect(() => {
    const linkedGoogleIds = new Set(client.googleAdAccounts.map((a) => a.customerId));
    const linkedMetaIds = new Set(client.metaAdAccounts.map((a) => a.accountId));

    Promise.all([
      fetch("/api/google-ads/accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
      fetch("/api/meta-ads/accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
    ]).then(([googleData, metaData]) => {
      setAvailableGoogle(
        (googleData.accounts ?? []).filter((a: AvailableGoogleAccount) => !linkedGoogleIds.has(a.customerId))
      );
      setAvailableMeta(
        (metaData.accounts ?? []).filter((a: AvailableMetaAccount) => !linkedMetaIds.has(a.accountId))
      );
    }).finally(() => setLoadingAvailable(false));
  }, [client]);

  function displayGoogleName(account: GoogleAdAccount) {
    if (account.alias) return account.alias;
    if (account.descriptiveName && !account.descriptiveName.startsWith("Conta ")) return account.descriptiveName;
    return formatCustomerId(account.customerId);
  }

  async function saveGoogleAlias(account: GoogleAdAccount) {
    const alias = googleAliases[account.id]?.trim();
    if (!alias) return;
    setSaving((s) => ({ ...s, [account.id]: true }));
    const res = await fetch(`/api/clients/${client.id}/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias }),
    });
    setSaving((s) => ({ ...s, [account.id]: false }));
    if (res.ok) {
      setSaved((s) => ({ ...s, [account.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [account.id]: false })), 2000);
      addToast(`Alias "${alias}" salvo com sucesso!`, "success");
    } else {
      addToast("Erro ao salvar alias. Tente novamente.", "error");
    }
  }

  async function saveMetaAlias(account: MetaAdAccount) {
    const alias = metaAliases[account.id]?.trim();
    if (!alias) return;
    setSaving((s) => ({ ...s, [account.id]: true }));
    const res = await fetch(`/api/clients/${client.id}/meta-accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias }),
    });
    setSaving((s) => ({ ...s, [account.id]: false }));
    if (res.ok) {
      setSaved((s) => ({ ...s, [account.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [account.id]: false })), 2000);
      addToast(`Alias "${alias}" salvo com sucesso!`, "success");
    } else {
      addToast("Erro ao salvar alias. Tente novamente.", "error");
    }
  }

  async function addGoogleAccounts() {
    if (selectedGoogle.size === 0) return;
    setAddingGoogle(true);
    const toAdd = availableGoogle.filter((a) => selectedGoogle.has(a.customerId));
    const res = await fetch(`/api/clients/${client.id}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts: toAdd }),
    });
    setAddingGoogle(false);
    if (res.ok) {
      addToast(`${toAdd.length} conta(s) Google adicionada(s)!`, "success");
      router.refresh();
    } else {
      addToast("Erro ao adicionar contas Google.", "error");
    }
  }

  async function addMetaAccounts() {
    if (selectedMeta.size === 0) return;
    setAddingMeta(true);
    const toAdd = availableMeta.filter((a) => selectedMeta.has(a.accountId));
    const res = await fetch(`/api/clients/${client.id}/meta-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts: toAdd }),
    });
    setAddingMeta(false);
    if (res.ok) {
      addToast(`${toAdd.length} conta(s) Meta adicionada(s)!`, "success");
      router.refresh();
    } else {
      addToast("Erro ao adicionar contas Meta.", "error");
    }
  }

  const hasGoogle = client.googleAdAccounts.length > 0 || availableGoogle.length > 0;
  const hasMeta = client.metaAdAccounts.length > 0 || availableMeta.length > 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500 text-sm">Gerenciar contas vinculadas</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Google Ads ── */}
        {(hasGoogle || !loadingAvailable) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                <path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Contas Google Ads</h2>
            </div>

            {/* Linked accounts with alias editing */}
            {client.googleAdAccounts.length > 0 && (
              <div className="space-y-3 mb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vinculadas</p>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    Nomes originais disponíveis após aprovação do <strong>Basic Access</strong>. Defina um apelido para cada conta.
                  </p>
                </div>
                {client.googleAdAccounts.map((account) => (
                  <AccountAliasRow
                    key={account.id}
                    label={displayGoogleName(account)}
                    sublabel={`ID: ${formatCustomerId(account.customerId)}`}
                    badge={account.isManagerAccount ? "MCC" : undefined}
                    value={googleAliases[account.id]}
                    placeholder={`Ex: ${client.name} - Principal`}
                    onChange={(v) => setGoogleAliases((a) => ({ ...a, [account.id]: v }))}
                    onSave={() => saveGoogleAlias(account)}
                    saving={saving[account.id]}
                    saved={saved[account.id]}
                  />
                ))}
              </div>
            )}

            {/* Available accounts to add */}
            {loadingAvailable ? (
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ) : availableGoogle.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Adicionar conta</p>
                <div className="space-y-2">
                  {availableGoogle.map((account) => {
                    const sel = selectedGoogle.has(account.customerId);
                    return (
                      <button key={account.customerId} type="button"
                        onClick={() => setSelectedGoogle((prev) => { const n = new Set(prev); n.has(account.customerId) ? n.delete(account.customerId) : n.add(account.customerId); return n; })}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition ${sel ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${sel ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                          {sel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
                <button
                  onClick={addGoogleAccounts}
                  disabled={selectedGoogle.size === 0 || addingGoogle}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                >
                  {addingGoogle ? "Adicionando..." : `Adicionar ${selectedGoogle.size > 0 ? `(${selectedGoogle.size})` : ""} conta(s) Google`}
                </button>
              </div>
            ) : client.googleAdAccounts.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
                Nenhuma conta disponível.{" "}
                <Link href="/integrations/google" className="text-blue-600 hover:underline">Conectar Google Ads</Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Todas as contas conectadas já estão vinculadas.</p>
            )}
          </div>
        )}

        {/* ── Meta Ads ── */}
        {(hasMeta || !loadingAvailable) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <h2 className="font-semibold text-slate-800">Contas Meta Ads</h2>
            </div>

            {/* Linked accounts with alias editing */}
            {client.metaAdAccounts.length > 0 && (
              <div className="space-y-3 mb-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vinculadas</p>
                {client.metaAdAccounts.map((account) => (
                  <AccountAliasRow
                    key={account.id}
                    label={account.alias || account.name}
                    sublabel={`ID: ${account.accountId}`}
                    value={metaAliases[account.id]}
                    placeholder={`Ex: ${client.name} - Meta`}
                    onChange={(v) => setMetaAliases((a) => ({ ...a, [account.id]: v }))}
                    onSave={() => saveMetaAlias(account)}
                    saving={saving[account.id]}
                    saved={saved[account.id]}
                  />
                ))}
              </div>
            )}

            {/* Available accounts to add */}
            {loadingAvailable ? (
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ) : availableMeta.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Adicionar conta</p>
                <div className="space-y-2">
                  {availableMeta.map((account) => {
                    const sel = selectedMeta.has(account.accountId);
                    return (
                      <button key={account.accountId} type="button"
                        onClick={() => setSelectedMeta((prev) => { const n = new Set(prev); n.has(account.accountId) ? n.delete(account.accountId) : n.add(account.accountId); return n; })}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition ${sel ? "border-[#1877F2] bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${sel ? "bg-[#1877F2] border-[#1877F2]" : "border-slate-300"}`}>
                          {sel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{account.name}</p>
                          <p className="text-xs text-slate-400">ID: {account.accountId} · {account.metaEmail ?? account.metaName ?? "Meta"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={addMetaAccounts}
                  disabled={selectedMeta.size === 0 || addingMeta}
                  className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                >
                  {addingMeta ? "Adicionando..." : `Adicionar ${selectedMeta.size > 0 ? `(${selectedMeta.size})` : ""} conta(s) Meta`}
                </button>
              </div>
            ) : client.metaAdAccounts.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
                Nenhuma conta disponível.{" "}
                <Link href="/integrations/meta" className="text-blue-600 hover:underline">Conectar Meta Ads</Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Todas as contas conectadas já estão vinculadas.</p>
            )}
          </div>
        )}

        {!loadingAvailable && !hasGoogle && !hasMeta && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <p className="text-slate-500 text-sm">Nenhuma conta integrada. Conecte o Google Ads ou o Meta Ads primeiro.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/integrations/google" className="text-sm text-blue-600 hover:underline">Google Ads</Link>
              <Link href="/integrations/meta" className="text-sm text-blue-600 hover:underline">Meta Ads</Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
          ← Voltar para clientes
        </Link>
      </div>
    </div>
  );
}

function AccountAliasRow({
  label, sublabel, badge, value, placeholder, onChange, onSave, saving, saved,
}: {
  label: string; sublabel: string; badge?: string;
  value: string; placeholder: string;
  onChange: (v: string) => void; onSave: () => void;
  saving?: boolean; saved?: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
            {badge && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium shrink-0">{badge}</span>}
          </div>
          <p className="text-xs text-slate-400">{sublabel}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button onClick={onSave} disabled={!value?.trim() || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition shrink-0"
        >
          {saved ? "✓ Salvo" : saving ? "..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
