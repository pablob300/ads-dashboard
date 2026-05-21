import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listMetaAdAccounts } from "@/lib/meta-ads";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const connections = await prisma.metaConnection.findMany({ where: { userId } });
  if (connections.length === 0) return NextResponse.json({ accounts: [] });

  const allAccounts = [];
  for (const conn of connections) {
    const accounts = await listMetaAdAccounts({
      accessToken: conn.accessToken,
      expiresAt: conn.expiresAt,
    });
    allAccounts.push(
      ...accounts.map((a) => ({
        ...a,
        connectionId: conn.id,
        metaEmail: conn.metaEmail,
        metaName: conn.metaName,
      }))
    );
  }

  return NextResponse.json({ accounts: allAccounts });
}
