import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCustomerId } from "@/lib/google-ads";
import { ClientBalanceTooltip } from "@/components/ClientBalanceTooltip";

export default async function ClientsPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;

  const clients = userId
    ? await prisma.client.findMany({
        where: { userId },
        include: {
          googleAdAccounts: {
            select: { id: true, customerId: true, descriptiveName: true, alias: true, isManagerAccount: true },
          },
          metaAdAccounts: {
            select: { id: true, accountId: true, name: true, alias: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum cliente ainda</h3>
          <p className="text-slate-500 text-sm mb-4">Crie seu primeiro cliente e vincule as contas de anúncio.</p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Criar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center">
                    <h3 className="font-semibold text-slate-900">{client.name}</h3>
                    <ClientBalanceTooltip clientId={client.id} />
                  </div>
                  {client.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{client.notes}</p>
                  )}
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full shrink-0">
                  {client.googleAdAccounts.length + client.metaAdAccounts.length} conta
                  {client.googleAdAccounts.length + client.metaAdAccounts.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-1.5">
                {(() => {
                  // Um cliente pode ter só Google, só Meta ou os dois — listar os dois canais.
                  const accounts = [
                    ...client.googleAdAccounts.map((acc) => ({
                      id: acc.id,
                      channel: "Google",
                      isManagerAccount: acc.isManagerAccount,
                      label:
                        acc.alias ||
                        (!acc.descriptiveName.startsWith("Conta ")
                          ? acc.descriptiveName
                          : formatCustomerId(acc.customerId)),
                    })),
                    ...client.metaAdAccounts.map((acc) => ({
                      id: acc.id,
                      channel: "Meta",
                      isManagerAccount: false,
                      label: acc.alias || acc.name,
                    })),
                  ];
                  return (
                    <>
                      {accounts.slice(0, 3).map((acc) => (
                        <div key={acc.id} className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-xs text-slate-600 truncate">{acc.label}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-1 rounded shrink-0">{acc.channel}</span>
                          {acc.isManagerAccount && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded shrink-0">MCC</span>
                          )}
                        </div>
                      ))}
                      {accounts.length > 3 && (
                        <p className="text-xs text-slate-400 pl-5">
                          +{accounts.length - 3} mais
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Link
                  href={`/clients/${client.id}/dashboard`}
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
                >
                  Ver dashboard
                </Link>
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
