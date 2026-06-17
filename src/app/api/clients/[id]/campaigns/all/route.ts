import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/google-ads";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_ADS_API_VERSION = "v21";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export interface CampaignListItem {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    include: { googleAdAccounts: true },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (client.googleAdAccounts.length === 0) return NextResponse.json({ campaigns: [] });

  const connections = await prisma.googleConnection.findMany({ where: { userId } });

  const allCampaigns: CampaignListItem[] = [];

  await Promise.all(
    client.googleAdAccounts.map(async (account) => {
      const conn = connections.find((c) => c.id === account.connectionId);
      if (!conn) return;
      try {
        const accessToken = await getValidAccessToken({
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          expiresAt: conn.expiresAt,
        });

        const res = await fetch(`${BASE_URL}/customers/${account.customerId}/googleAds:search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name ASC",
          }),
        });

        if (!res.ok) return;
        const data = await res.json();
        for (const row of data.results ?? []) {
          const c = row.campaign as { id: string; name: string; status: string };
          if (!allCampaigns.find((x) => x.id === c.id)) {
            allCampaigns.push({ id: c.id, name: c.name, status: c.status });
          }
        }
      } catch {
        // ignora contas inacessíveis
      }
    })
  );

  allCampaigns.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ campaigns: allCampaigns });
}
