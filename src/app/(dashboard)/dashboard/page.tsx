import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) return null;

  const [clientCount, googleAccountCount, metaAccountCount, googleConnectionCount] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.googleAdAccount.count({ where: { client: { userId } } }),
    prisma.metaAdAccount.count({ where: { client: { userId } } }),
    prisma.googleConnection.count({ where: { userId } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {session?.user.name?.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Bem-vindo ao seu painel de campanhas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Clientes cadastrados</p>
          <p className="text-3xl font-bold text-slate-900">{clientCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Contas Google Ads</p>
          <p className="text-3xl font-bold text-slate-900">{googleAccountCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Contas Meta Ads</p>
          <p className="text-3xl font-bold text-slate-900">{metaAccountCount}</p>
        </div>
      </div>

      {clientCount === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Nenhum cliente ainda</h3>
          <p className="text-slate-500 text-sm mb-4">
            Conecte sua conta Google Ads e crie seu primeiro cliente
          </p>
          <div className="flex gap-3 justify-center">
            {googleConnectionCount === 0 && (
              <Link
                href="/onboarding"
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Conectar Google Ads
              </Link>
            )}
            <Link
              href="/clients/new"
              className="bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              Criar cliente
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
