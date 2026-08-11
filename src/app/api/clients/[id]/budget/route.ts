import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCampaignData } from "@/lib/google-ads-campaigns";
import { fetchMetaCampaignData } from "@/lib/meta-ads-campaigns";
import {
  monthRange,
  type BudgetEntryRow,
  type GetBudgetResponse,
} from "@/lib/budget";
import { CHANNEL_KEYS, channelLabel, grossUpSpend } from "@/lib/channels";
import { groupCampaignsByChannel } from "@/lib/sub-reports";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

interface CampaignSpend {
  name: string;
  raw: number;
}

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

  const { start, end } = monthRange(year, month);

  const subReportsRaw = await prisma.subReport.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    include: { campaigns: true },
  });

  const savedEntries = await prisma.budgetEntry.findMany({
    where: { clientId, year, month },
  });

  const availableChannels: string[] = [];
  if (client.googleAdAccounts.length > 0) availableChannels.push("google");
  if (client.metaAdAccounts.length > 0) availableChannels.push("meta");

  const errors: GetBudgetResponse["errors"] = { google: null, meta: null };
  const spendMaps: Record<string, Map<string, CampaignSpend>> = {};

  if (client.googleAdAccounts.length > 0) {
    try {
      const connections = await prisma.googleConnection.findMany({ where: { userId } });
      const results = await Promise.all(
        client.googleAdAccounts.map(async (account) => {
          const conn = connections.find((c) => c.id === account.connectionId);
          if (!conn) return null;
          return fetchCampaignData(
            { accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: conn.expiresAt },
            account.customerId,
            start,
            end
          );
        })
      );
      const map = new Map<string, CampaignSpend>();
      for (const r of results) {
        if (!r) continue;
        for (const c of r.campaigns) {
          const existing = map.get(c.id);
          if (existing) existing.raw += c.costBRL;
          else map.set(c.id, { name: c.name, raw: c.costBRL });
        }
      }
      spendMaps.google = map;
    } catch (err) {
      errors.google = err instanceof Error ? err.message : "Erro ao consultar Google Ads API";
    }
  }

  if (client.metaAdAccounts.length > 0) {
    try {
      const connections = await prisma.metaConnection.findMany({ where: { userId } });
      const results = await Promise.all(
        client.metaAdAccounts.map(async (account) => {
          const conn = connections.find((c) => c.id === account.connectionId);
          if (!conn) return null;
          return fetchMetaCampaignData(
            { accessToken: conn.accessToken, expiresAt: conn.expiresAt },
            account.accountId,
            start,
            end
          );
        })
      );
      const map = new Map<string, CampaignSpend>();
      for (const r of results) {
        if (!r) continue;
        for (const c of r.campaigns) {
          const existing = map.get(c.id);
          if (existing) existing.raw += c.spend;
          else map.set(c.id, { name: c.name, raw: c.spend });
        }
      }
      spendMaps.meta = map;
    } catch (err) {
      errors.meta = err instanceof Error ? err.message : "Erro ao consultar Meta Ads API";
    }
  }

  const entries: BudgetEntryRow[] = savedEntries.map((e) => {
    const map = spendMaps[e.channel];
    let campaignIds: string[];
    let name: string;

    if (e.subReportId) {
      const sr = subReportsRaw.find((s) => s.id === e.subReportId);
      // O sub-relatório é comum aos canais; esta verba é de um canal só, então
      // conta apenas as campanhas daquele canal.
      campaignIds = sr ? groupCampaignsByChannel(sr.campaigns)[e.channel] ?? [] : [];
      name = sr?.name ?? "(sub-relatório removido)";
    } else {
      campaignIds = map ? Array.from(map.keys()) : [];
      name = `Total ${channelLabel(e.channel)}`;
    }

    let spent = 0;
    if (map) {
      for (const id of campaignIds) {
        spent += grossUpSpend(map.get(id)?.raw ?? 0, e.channel);
      }
    }

    return { subReportId: e.subReportId, channel: e.channel, name, budgetAmount: e.amount, spent };
  });

  const response: GetBudgetResponse = {
    year,
    month,
    subReports: subReportsRaw.map((sr) => ({ id: sr.id, name: sr.name })),
    availableChannels,
    entries,
    errors,
  };
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
