"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";

interface Connection {
  id: string;
  googleEmail: string;
  createdAt: Date;
}

interface Props {
  connections: Connection[];
}

export default function OnboardingClient({ connections }: Props) {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "connected") addToast("Conta Google Ads conectada com sucesso!", "success");
    else if (error === "access_denied") addToast("Acesso negado. Tente novamente.", "error");
    else if (error === "token_exchange") addToast("Erro ao conectar. Tente novamente.", "error");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Conectar Google Ads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vincule sua conta Google para acessar os dados de campanhas dos seus clientes.
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
                  <svg viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{conn.googleEmail}</p>
                  <p className="text-xs text-slate-400">
                    Conectado em {new Date(conn.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Ativo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card de conectar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <svg viewBox="0 0 48 48" className="w-7 h-7">
              <path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              {connections.length === 0 ? "Conectar Google Ads" : "Adicionar outra conta"}
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Você será redirecionado para o Google para autorizar o acesso de leitura às suas campanhas.
              Nenhuma modificação será feita nas suas contas.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Permissões solicitadas:</p>
              {[
                "Visualizar campanhas e grupos de anúncios",
                "Ler métricas de desempenho (cliques, impressões, custo)",
                "Acessar dados de conversão",
                "Ver contas gerenciadas pelo MCC",
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
              href="/api/google-ads/connect"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Autorizar com Google
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
