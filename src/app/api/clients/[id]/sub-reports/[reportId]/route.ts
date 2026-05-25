import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  campaignIds: z.array(z.string()).min(1).optional(),
});

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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const updated = await prisma.subReport.update({
      where: { id: reportId },
      data: parsed.data,
    });

    return NextResponse.json({ subReport: updated });
  } catch (err) {
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
