import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

async function getClientForUser(clientId: string, userId: string) {
  return prisma.client.findFirst({ where: { id: clientId, userId } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId } = await params;

    const client = await getClientForUser(clientId, userId);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const shareLinks = await prisma.shareLink.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ shareLinks });
  } catch (err) {
    console.error("share GET error:", err);
    return NextResponse.json({ error: "Erro ao buscar links." }, { status: 500 });
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

    const body = await req.json().catch(() => ({}));
    const label: string | undefined = body.label?.trim() || undefined;
    const expiresAt: Date | undefined = body.expiresAt ? new Date(body.expiresAt) : undefined;

    const token = randomBytes(32).toString("hex");
    const shareLink = await prisma.shareLink.create({
      data: { clientId, token, label, expiresAt },
    });
    return NextResponse.json({ shareLink }, { status: 201 });
  } catch (err) {
    console.error("share POST error:", err);
    return NextResponse.json({ error: "Erro ao criar link." }, { status: 500 });
  }
}
