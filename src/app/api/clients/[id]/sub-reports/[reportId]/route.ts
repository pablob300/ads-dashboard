import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flattenCampaignsByChannel, groupCampaignsByChannel } from "@/lib/sub-reports";
import { updateSubReportSchema } from "@/lib/sub-reports-schema";
import { NextRequest, NextResponse } from "next/server";

/** Erro do Prisma para violação de constraint única (aqui: nome repetido no cliente). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

async function getSubReportForUser(reportId: string, clientId: string, userId: string) {
  return prisma.subReport.findFirst({
    where: { id: reportId, clientId, client: { userId } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId, reportId } = await params;

    const report = await getSubReportForUser(reportId, clientId, userId);
    if (!report) return NextResponse.json({ error: "Sub-relatório não encontrado" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSubReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const { name, campaignsByChannel } = parsed.data;

    // Substituição declarativa das campanhas: apaga o que havia e recria a
    // partir do que veio, para que remover uma campanha reflita no banco.
    const updated = await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.subReport.update({ where: { id: reportId }, data: { name } });
      }
      if (campaignsByChannel !== undefined) {
        await tx.subReportCampaign.deleteMany({ where: { subReportId: reportId } });
        await tx.subReportCampaign.createMany({
          data: flattenCampaignsByChannel(campaignsByChannel).map((c) => ({ ...c, subReportId: reportId })),
        });
      }
      return tx.subReport.findUniqueOrThrow({
        where: { id: reportId },
        include: { campaigns: true },
      });
    });

    const { campaigns, ...sr } = updated;
    return NextResponse.json({
      subReport: { ...sr, campaignsByChannel: groupCampaignsByChannel(campaigns) },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Já existe um sub-relatório com esse nome para este cliente." },
        { status: 409 }
      );
    }
    console.error("sub-reports PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar sub-relatório." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId, reportId } = await params;

    const report = await getSubReportForUser(reportId, clientId, userId);
    if (!report) return NextResponse.json({ error: "Sub-relatório não encontrado" }, { status: 404 });

    await prisma.subReport.delete({ where: { id: reportId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sub-reports DELETE error:", err);
    return NextResponse.json({ error: "Erro ao excluir sub-relatório." }, { status: 500 });
  }
}
