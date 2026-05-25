import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const createSchema = z.object({
  name: z.string().min(1),
  channel: z.string().min(1),
  campaignIds: z.array(z.string()).min(1),
});

async function getClientForUser(clientId: string, userId: string) {
  return prisma.client.findFirst({ where: { id: clientId, userId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId } = await params;

    const client = await getClientForUser(clientId, userId);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const channel = req.nextUrl.searchParams.get("channel") ?? undefined;
    const subReports = await prisma.subReport.findMany({
      where: { clientId, ...(channel ? { channel } : {}) },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ subReports });
  } catch (err) {
    console.error("sub-reports GET error:", err);
    return NextResponse.json({ error: "Erro ao buscar sub-relatórios." }, { status: 500 });
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const subReport = await prisma.subReport.create({
      data: { clientId, ...parsed.data },
    });

    return NextResponse.json({ subReport }, { status: 201 });
  } catch (err) {
    console.error("sub-reports POST error:", err);
    return NextResponse.json({ error: "Erro ao salvar no banco de dados." }, { status: 500 });
  }
}
