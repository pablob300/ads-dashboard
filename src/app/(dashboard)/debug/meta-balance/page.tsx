import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MetaBalanceClient from "./meta-balance-client";

export const dynamic = "force-dynamic";

export default async function MetaBalanceDebugPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) return null;

  const logs = await prisma.debugApiLog.findMany({
    where: { userId, endpoint: "meta-balance" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

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
