import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  accounts: z.array(z.object({
    connectionId: z.string(),
    accountId: z.string(),
    name: z.string(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
  })).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  try {
    const { accounts } = schema.parse(await req.json());

    const created = await prisma.metaAdAccount.createMany({
      data: accounts.map((a) => ({
        clientId: id,
        connectionId: a.connectionId,
        accountId: a.accountId,
        name: a.name,
        currency: a.currency ?? "BRL",
        timezone: a.timezone ?? "America/Sao_Paulo",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao adicionar contas" }, { status: 500 });
  }
}
