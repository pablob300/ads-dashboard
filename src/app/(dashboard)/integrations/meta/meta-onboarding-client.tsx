"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";

interface Connection {
  id: string;
  metaName: string | null;
  metaEmail: string | null;
  createdAt: Date;
}

interface Props {
  connections: Connection[];
  configured: boolean;
}

export default function MetaOnboardingClient({ connections, configured }: Props) {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "connected") addToast("Conta Meta Ads conectada com sucesso!", "success");
    else if (error === "access_denied") addToast("Acesso negado. Tente novamente.", "error");
    else if (error === "token_exchange") addToast("Erro ao conectar. Tente novamente.", "error");
    else if (error === "not_configured") addToast("META_APP_ID não configurado no servidor.", "error");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Conectar Meta Ads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vincule sua conta Meta para acessar os dados de campanhas do Facebook e Instagram Ads.
        </p>
      </div>

      {/* Contas já conectadas */}
      {connections.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Contas vinculadas ({connections.length})
          </h2>
          <div className="space-y-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {conn.metaName ?? conn.metaEmail ?? "Conta Meta"}
                  </p>
                  {conn.metaEmail && (
                    <p className="text-xs text-slate-400 truncate">{conn.metaEmail}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    Conectado em {new Date(conn.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Ativo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card de conectar nova conta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {!configured && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 font-medium mb-1">Configuração necessária</p>
            <p className="text-xs text-amber-700">
              Adicione <code className="bg-amber-100 px-1 rounded">META_APP_ID</code> e{" "}
              <code className="bg-amber-100 px-1 rounded">META_APP_SECRET</code> no arquivo{" "}
              <code className="bg-amber-100 px-1 rounded">.env</code> com as credenciais do seu aplicativo em{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">
                developers.facebook.com
              </a>
              .
            </p>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              {connections.length === 0 ? "Conectar Meta Ads" : "Adicionar outra conta"}
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Você será redirecionado ao Meta para autorizar o acesso de leitura às campanhas do Facebook e Instagram Ads.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Permissões solicitadas:</p>
              {[
                "Visualizar campanhas e conjuntos de anúncios",
                "Ler métricas de desempenho (cliques, impressões, gasto)",
                "Acessar dados de conversão e eventos",
                "Ver contas de anúncio vinculadas ao perfil",
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-slate-600">{perm}</span>
                </div>
              ))}
            </div>

            <a
              href={configured ? "/api/meta-ads/connect" : "#"}
              className={`inline-flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition ${
                configured
                  ? "bg-[#1877F2] hover:bg-[#166fe5]"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Autorizar com Meta
            </a>
          </div>
        </div>
      </div>

      {connections.length > 0 && (
        <div className="mt-6">
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Continuar — Criar cliente
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
