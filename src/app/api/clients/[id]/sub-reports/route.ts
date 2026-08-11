import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flattenCampaignsByChannel, groupCampaignsByChannel } from "@/lib/sub-reports";
import { createSubReportSchema } from "@/lib/sub-reports-schema";
import { NextRequest, NextResponse } from "next/server";

async function getClientForUser(clientId: string, userId: string) {
  return prisma.client.findFirst({ where: { id: clientId, userId } });
}

/** Erro do Prisma para violação de constraint única (aqui: nome repetido no cliente). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId } = await params;

    const client = await getClientForUser(clientId, userId);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    // Sem filtro de canal: o sub-relatório é comum a todos os canais, e as duas
    // abas do dashboard mostram a mesma lista.
    const rows = await prisma.subReport.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
      include: { campaigns: true },
    });

    const subReports = rows.map(({ campaigns, ...sr }) => ({
      ...sr,
      campaignsByChannel: groupCampaignsByChannel(campaigns),
    }));

    return NextResponse.json({ subReports });
  } catch (err) {
    console.error("sub-reports GET error:", err);
    // Degrada em vez de quebrar o dashboard enquanto a migration não foi
    // aplicada em produção (mesmo padrão de /debug/meta-balance).
    return NextResponse.json({ subReports: [], error: "Erro ao buscar sub-relatórios." });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId } = await params;

    const client = await getClientForUser(clientId, userId);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const body = await req.json();
    const parsed = createSubReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const { name, campaignsByChannel } = parsed.data;

    const created = await prisma.subReport.create({
      data: {
        clientId,
        name,
        campaigns: { create: flattenCampaignsByChannel(campaignsByChannel) },
      },
      include: { campaigns: true },
    });

    const { campaigns, ...sr } = created;
    return NextResponse.json(
      { subReport: { ...sr, campaignsByChannel: groupCampaignsByChannel(campaigns) } },
      { status: 201 }
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Já existe um sub-relatório com esse nome para este cliente." },
        { status: 409 }
      );
    }
    console.error("sub-reports POST error:", err);
    return NextResponse.json({ error: "Erro ao salvar no banco de dados." }, { status: 500 });
  }
}
