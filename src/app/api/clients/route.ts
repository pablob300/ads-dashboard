import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const googleAccountSchema = z.object({
  connectionId: z.string(),
  customerId: z.string(),
  descriptiveName: z.string(),
  currencyCode: z.string().optional(),
  timeZone: z.string().optional(),
  isManagerAccount: z.boolean().optional(),
});

const metaAccountSchema = z.object({
  connectionId: z.string(),
  accountId: z.string(),
  name: z.string(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(2),
  notes: z.string().optional(),
  googleAccounts: z.array(googleAccountSchema).optional().default([]),
  metaAccounts: z.array(metaAccountSchema).optional().default([]),
}).refine(
  (d) => (d.googleAccounts?.length ?? 0) + (d.metaAccounts?.length ?? 0) > 0,
  { message: "Selecione ao menos uma conta de anúncio (Google Ads ou Meta Ads)" }
);

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const { name, notes, googleAccounts, metaAccounts } = schema.parse(body);

    const client = await prisma.client.create({
      data: {
        userId,
        name,
        notes,
        googleAdAccounts: {
          create: googleAccounts.map((a) => ({
            connectionId: a.connectionId,
            customerId: a.customerId,
            descriptiveName: a.descriptiveName,
            currencyCode: a.currencyCode ?? "BRL",
            timeZone: a.timeZone ?? "America/Sao_Paulo",
            isManagerAccount: a.isManagerAccount ?? false,
          })),
        },
        metaAdAccounts: {
          create: metaAccounts.map((a) => ({
            connectionId: a.connectionId,
            accountId: a.accountId,
            name: a.name,
            currency: a.currency ?? "BRL",
            timezone: a.timezone ?? "America/Sao_Paulo",
          })),
        },
      },
      include: { googleAdAccounts: true, metaAdAccounts: true },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      googleAdAccounts: {
        select: { id: true, customerId: true, descriptiveName: true, isManagerAccount: true },
      },
      metaAdAccounts: {
        select: { id: true, accountId: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}
