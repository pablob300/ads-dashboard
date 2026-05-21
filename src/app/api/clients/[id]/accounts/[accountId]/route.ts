import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  alias: z.string().min(1).max(100),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id, accountId } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  try {
    const { alias } = schema.parse(await req.json());
    const updated = await prisma.googleAdAccount.update({
      where: { id: accountId, clientId: id },
      data: { alias },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
