import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id, accountId } = await params;

  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const { alias } = await req.json();

  const updated = await prisma.metaAdAccount.update({
    where: { id: accountId },
    data: { alias: alias?.trim() || null },
  });

  return NextResponse.json(updated);
}
