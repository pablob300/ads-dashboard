import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id: clientId, shareId } = await params;

    const share = await prisma.shareLink.findFirst({
      where: { id: shareId, clientId, client: { userId } },
    });
    if (!share) return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });

    await prisma.shareLink.delete({ where: { id: shareId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("share DELETE error:", err);
    return NextResponse.json({ error: "Erro ao revogar link." }, { status: 500 });
  }
}
