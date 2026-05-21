import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAccessibleAccounts } from "@/lib/google-ads";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const connections = await prisma.googleConnection.findMany({
    where: { userId },
  });

  if (connections.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const results = await Promise.all(
    connections.map(async (conn) => {
      try {
        const accounts = await listAccessibleAccounts({
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          expiresAt: conn.expiresAt,
        });
        return accounts.map((a) => ({ ...a, connectionId: conn.id, googleEmail: conn.googleEmail }));
      } catch (err) {
        console.error(`Error fetching accounts for ${conn.googleEmail}:`, (err as Error).message);
        return [];
      }
    })
  );

  return NextResponse.json({ accounts: results.flat() });
}
