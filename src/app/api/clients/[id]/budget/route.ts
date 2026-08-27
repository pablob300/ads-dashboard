import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBudgetResponse } from "@/lib/budget-server";
import { CHANNEL_KEYS } from "@/lib/channels";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    include: { googleAdAccounts: true, metaAdAccounts: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const today = new Date();
  const year = Number(searchParams.get("year")) || today.getFullYear();
  const month = Number(searchParams.get("month")) || today.getMonth() + 1;

  // O cálculo mora em budget-server porque a rota pública do link compartilhado
  // usa exatamente o mesmo — ver src/lib/budget-server.ts.
  const response = await buildBudgetResponse(
    clientId,
    {
      google: client.googleAdAccounts.map((a) => ({ connectionId: a.connectionId, customerId: a.customerId })),
      meta: client.metaAdAccounts.map((a) => ({ connectionId: a.connectionId, accountId: a.accountId })),
    },
    year,
    month
  );
  return NextResponse.json(response);
}

const entrySchema = z.object({
  subReportId: z.string().nullable(),
  channel: z.enum(CHANNEL_KEYS as [string, ...string[]]),
  amount: z.number().min(0),
});

const postSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  entries: z.array(entrySchema),
});

function entryKey(subReportId: string | null, channel: string): string {
  return `${subReportId ?? "null"}:${channel}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: clientId } = await params;

  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const { year, month, entries } = parsed.data;

  const seenKeys = new Set<string>();
  for (const e of entries) {
    const key = entryKey(e.subReportId, e.channel);
    if (seenKeys.has(key)) {
      return NextResponse.json({ error: "Existem sub-relatório e canal duplicados no envio." }, { status: 400 });
    }
    seenKeys.add(key);
  }

  const subReportIds = entries
    .map((e) => e.subReportId)
    .filter((id): id is string => id !== null);

  if (subReportIds.length > 0) {
    const validCount = await prisma.subReport.count({
      where: { id: { in: subReportIds }, clientId },
    });
    if (validCount !== new Set(subReportIds).size) {
      return NextResponse.json({ error: "Sub-relatório inválido." }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.budgetEntry.findMany({ where: { clientId, year, month } });
    const submittedKeys = new Set(entries.map((e) => entryKey(e.subReportId, e.channel)));

    for (const ex of existing) {
      if (!submittedKeys.has(entryKey(ex.subReportId, ex.channel))) {
        await tx.budgetEntry.delete({ where: { id: ex.id } });
      }
    }

    for (const entry of entries) {
      const found = await tx.budgetEntry.findFirst({
        where: { clientId, subReportId: entry.subReportId, channel: entry.channel, year, month },
      });
      if (found) {
        await tx.budgetEntry.update({
          where: { id: found.id },
          data: { amount: entry.amount },
        });
      } else {
        await tx.budgetEntry.create({
          data: { clientId, subReportId: entry.subReportId, channel: entry.channel, year, month, amount: entry.amount },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
