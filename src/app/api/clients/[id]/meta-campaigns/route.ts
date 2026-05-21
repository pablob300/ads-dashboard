import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchMetaCampaignData } from "@/lib/meta-ads-campaigns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId },
    include: { metaAdAccounts: true },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");
  const startDate = startParam ? new Date(startParam + "T00:00:00") : firstOfMonth;
  const endDate = endParam ? new Date(endParam + "T23:59:59") : today;

  if (client.metaAdAccounts.length === 0) {
    return NextResponse.json({ isSampleData: true, campaigns: [], dailyMetrics: [] });
  }

  const connections = await prisma.metaConnection.findMany({ where: { userId } });

  const results = await Promise.all(
    client.metaAdAccounts.map(async (account) => {
      const conn = connections.find((c) => c.id === account.connectionId);
      if (!conn) return null;
      return fetchMetaCampaignData(
        { accessToken: conn.accessToken, expiresAt: conn.expiresAt },
        account.accountId,
        startDate,
        endDate
      );
    })
  );

  const valid = results.filter(Boolean);
  if (valid.length === 0) {
    return NextResponse.json({ isSampleData: true, campaigns: [], dailyMetrics: [] });
  }

  const isSampleData = valid.every((r) => r!.isSampleData);
  const allCampaigns = valid.flatMap((r) => r!.campaigns);

  const dailyMap = new Map<string, { impressions: number; clicks: number; spend: number; conversions: number }>();
  for (const result of valid) {
    for (const day of result!.dailyMetrics) {
      const existing = dailyMap.get(day.date);
      if (existing) {
        existing.impressions += day.impressions;
        existing.clicks += day.clicks;
        existing.spend += day.spend;
        existing.conversions += day.conversions;
      } else {
        dailyMap.set(day.date, { ...day });
      }
    }
  }

  return NextResponse.json({
    isSampleData,
    campaigns: allCampaigns,
    dailyMetrics: Array.from(dailyMap.entries())
      .map(([date, m]) => ({ date, ...m }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
}
