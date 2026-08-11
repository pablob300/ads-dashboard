import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BudgetControl from "./budget-control";

const MIGRATION_SQL = `CREATE TABLE "budget_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subReportId" TEXT,
    "channel" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "budget_entries_clientId_year_month_idx" ON "budget_entries"("clientId", "year", "month");

CREATE UNIQUE INDEX "budget_entries_clientId_subReportId_channel_year_month_key" ON "budget_entries"("clientId", "subReportId", "channel", "year", "month");

ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_subReportId_fkey" FOREIGN KEY ("subReportId") REFERENCES "sub_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;

export default async function BudgetControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId },
    select: { id: true, name: true },
  });
  if (!client) redirect("/clients");

  let migrationPending = false;
  try {
    await prisma.budgetEntry.count();
  } catch {
    migrationPending = true;
  }

  if (migrationPending) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Controle de Orçamento</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">Migration pendente no Supabase</p>
              <p className="text-sm text-amber-700 mt-1">
                A tabela <code className="bg-amber-100 px-1 rounded">budget_entries</code> ainda não existe.
                Execute o SQL abaixo no <strong>Supabase SQL Editor</strong> e recarregue esta página.
              </p>
              <pre className="mt-4 bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                {MIGRATION_SQL}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <BudgetControl client={client} />;
}
