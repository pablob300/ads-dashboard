import { getClientByToken } from "@/lib/share-token";
import { prisma } from "@/lib/prisma";
import { groupCampaignsByChannel } from "@/lib/sub-reports";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await getClientByToken(token);
    if (!client) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });

    // Sem filtro de canal — o sub-relatório é comum aos canais.
    const rows = await prisma.subReport.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "asc" },
      include: { campaigns: true },
    });

    const subReports = rows.map(({ campaigns, ...sr }) => ({
      ...sr,
      campaignsByChannel: groupCampaignsByChannel(campaigns),
    }));

    return NextResponse.json({ subReports });
  } catch (err) {
    console.error("share sub-reports error:", err);
    return NextResponse.json({ subReports: [], error: "Erro ao buscar sub-relatórios." });
  }
}
