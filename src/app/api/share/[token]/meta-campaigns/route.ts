import { getClientByToken } from "@/lib/share-token";
import { prisma } from "@/lib/prisma";
import { fetchMetaCampaignData } from "@/lib/meta-ads-campaigns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await getClientByToken(token);
    if (!client) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });

    const { searchParams } = req.nextUrl;
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")! + "T00:00:00") : firstOfMonth;
    const endDate   = searchParams.get("endDate")   ? new Date(searchParams.get("endDate")!   + "T23:59:59") : today;

    if (client.metaAdAccounts.length === 0) {
      return NextResponse.json({ isSampleData: false, campaigns: [], dailyMetrics: [] });
    }

    const results = await Promise.all(
      client.metaAdAccounts.map(async (account) => {
        const conn = await prisma.metaConnection.findUnique({ where: { id: account.connectionId } });
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
      return NextResponse.json({ isSampleData: false, campaigns: [], dailyMetrics: [] });
    }

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
      isSampleData: false,
      campaigns: allCampaigns,
      dailyMetrics: Array.from(dailyMap.entries())
        .map(([date, m]) => ({ date, ...m }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    console.error("share meta-campaigns error:", err);
    const message = err instanceof Error ? err.message : "Erro ao buscar campanhas.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
