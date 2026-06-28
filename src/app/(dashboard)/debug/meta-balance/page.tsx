import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MetaBalanceClient from "./meta-balance-client";

export const dynamic = "force-dynamic";

const MIGRATION_SQL = `CREATE TABLE "debug_api_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "clientName" TEXT,
  "accountId" TEXT,
  "accountName" TEXT,
  "rawResponse" JSONB,
  "parsedValue" DOUBLE PRECISION,
  "httpStatus" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debug_api_logs_pkey" PRIMARY KEY ("id")
);`;

export default async function MetaBalanceDebugPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) return null;

  let logs: Awaited<ReturnType<typeof prisma.debugApiLog.findMany>> = [];
  let migrationPending = false;

  try {
    logs = await prisma.debugApiLog.findMany({
      where: { userId, endpoint: "meta-balance" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    migrationPending = true;
  }

  if (migrationPending) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Debug — Meta Balance</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">Migration pendente no Supabase</p>
              <p className="text-sm text-amber-700 mt-1">
                A tabela <code className="bg-amber-100 px-1 rounded">debug_api_logs</code> ainda não existe.
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

  return (
    <MetaBalanceClient
      logs={logs.map((l) => ({
        ...l,
        rawResponse: l.rawResponse as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
