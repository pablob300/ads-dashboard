import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGoogleAdsBalance } from "@/lib/google-ads-campaigns";
import { fetchMetaAdsBalance } from "@/lib/meta-ads-campaigns";
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
      googleAdAccounts: { include: { connection: true } },
      metaAdAccounts: { include: { connection: true } },
    },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const googleBalances = await Promise.all(
    client.googleAdAccounts
      .filter((acc) => !acc.isManagerAccount)
      .map((acc) =>
        fetchGoogleAdsBalance(
          {
            accessToken: acc.connection.accessToken,
            refreshToken: acc.connection.refreshToken,
            expiresAt: acc.connection.expiresAt,
          },
          acc.customerId
        )
      )
  );
  const validGoogle = googleBalances.filter((b): b is number => b !== null);
  const google = validGoogle.length > 0 ? validGoogle.reduce((a, b) => a + b, 0) : null;

  const metaBalances = await Promise.all(
    client.metaAdAccounts.map((acc) =>
      fetchMetaAdsBalance(
        { accessToken: acc.connection.accessToken, expiresAt: acc.connection.expiresAt },
        acc.accountId
      )
    )
  );
  const validMeta = metaBalances.filter((b): b is number => b !== null);
  const meta = validMeta.length > 0 ? validMeta.reduce((a, b) => a + b, 0) : null;

  return NextResponse.json({ google, meta });
}
