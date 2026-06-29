import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBudgetRecommendations } from "@/lib/google-ads-campaigns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId },
    include: {
      googleAdAccounts: {
        where: { isManagerAccount: false },
        include: { connection: true },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const allRecs = await Promise.all(
    client.googleAdAccounts.map((acc) =>
      fetchBudgetRecommendations(
        {
          accessToken: acc.connection.accessToken,
          refreshToken: acc.connection.refreshToken,
          expiresAt: acc.connection.expiresAt,
        },
        acc.customerId
      )
    )
  );

  return NextResponse.json({ recommendations: allRecs.flat() });
}
