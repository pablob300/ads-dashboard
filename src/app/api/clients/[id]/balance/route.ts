import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGoogleAdsBalance } from "@/lib/google-ads-campaigns";
import { fetchMetaAdsBalance } from "@/lib/meta-ads-campaigns";
import { formatCustomerId } from "@/lib/google-ads";
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

  const nonMccAccounts = client.googleAdAccounts.filter((acc) => !acc.isManagerAccount);

  const googleAccounts = nonMccAccounts.length === 0 ? null : await Promise.all(
    nonMccAccounts.map(async (acc) => {
      const name =
        acc.alias ||
        (!acc.descriptiveName.startsWith("Conta ")
          ? acc.descriptiveName
          : formatCustomerId(acc.customerId));
      const balance = await fetchGoogleAdsBalance(
        {
          accessToken: acc.connection.accessToken,
          refreshToken: acc.connection.refreshToken,
          expiresAt: acc.connection.expiresAt,
        },
        acc.customerId
      );
      return { name, balance: balance !== null ? balance : ("postpaid" as const) };
    })
  );

  const metaAccounts = client.metaAdAccounts.length === 0 ? null : await Promise.all(
    client.metaAdAccounts.map(async (acc) => {
      const name = acc.alias || acc.name;
      const balance = await fetchMetaAdsBalance(
        { accessToken: acc.connection.accessToken, expiresAt: acc.connection.expiresAt },
        acc.accountId
      );
      return { name, balance: balance !== null ? balance : 0 };
    })
  );

  return NextResponse.json({ googleAccounts, metaAccounts });
}
