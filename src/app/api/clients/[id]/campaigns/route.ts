import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCampaignData } from "@/lib/google-ads-campaigns";
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
    include: {
      googleAdAccounts: true,
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const startDate = startParam ? new Date(startParam + "T00:00:00") : firstOfMonth;
  const endDate = endParam ? new Date(endParam + "T23:59:59") : today;

  if (client.googleAdAccounts.length === 0) {
    return NextResponse.json({ isSampleData: false, campaigns: [], dailyMetrics: [] });
  }

  // Busca dados de cada conta e agrega
  const connections = await prisma.googleConnection.findMany({
    where: { userId },
  });

  let results;
  try {
    results = await Promise.all(
      client.googleAdAccounts.map(async (account) => {
        const conn = connections.find((c) => c.id === account.connectionId);
        if (!conn) return null;
        return fetchCampaignData(
          { accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: conn.expiresAt },
          account.customerId,
          startDate,
          endDate
        );
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar Google Ads API";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const valid = results.filter(Boolean);
  if (valid.length === 0) {
    return NextResponse.json({ isSampleData: false, campaigns: [], dailyMetrics: [] });
  }

  // Agrega campanhas de todas as contas
  const allCampaigns = valid.flatMap((r) => r!.campaigns);

  // Agrega métricas diárias de todas as contas
  const dailyMap = new Map<string, { impressions: number; clicks: number; costBRL: number; conversions: number }>();
  for (const result of valid) {
    for (const day of result!.dailyMetrics) {
      const existing = dailyMap.get(day.date);
      if (existing) {
        existing.impressions += day.impressions;
        existing.clicks += day.clicks;
        existing.costBRL += day.costBRL;
        existing.conversions += day.conversions;
      } else {
        dailyMap.set(day.date, { ...day });
      }
    }
  }

  return NextResponse.json({
    isSampleData: false,
    campaigns: allCampaigns,
    dailyMetrics: Array.from(dailyMap.entries())
      .map(([date, m]) => ({ date, ...m }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
}
