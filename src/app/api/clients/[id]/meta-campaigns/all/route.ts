import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface MetaCampaignListItem {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | string;
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
    include: { metaAdAccounts: true },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (client.metaAdAccounts.length === 0) return NextResponse.json({ campaigns: [] });

  const connections = await prisma.metaConnection.findMany({ where: { userId } });
  const allCampaigns: MetaCampaignListItem[] = [];

  await Promise.all(
    client.metaAdAccounts.map(async (account) => {
      const conn = connections.find((c) => c.id === account.connectionId);
      if (!conn) return;
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/act_${account.accountId}/campaigns?fields=id,name,status&limit=200&access_token=${conn.accessToken}`
        );
        if (!res.ok) return;
        const data = await res.json();
        for (const c of data.data ?? []) {
          if (c.status === "DELETED" || c.status === "ARCHIVED") continue;
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
