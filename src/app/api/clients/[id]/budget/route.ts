import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCampaignData } from "@/lib/google-ads-campaigns";
import { fetchMetaCampaignData } from "@/lib/meta-ads-campaigns";
import {
  channelLabel,
  grossUpMetaSpend,
  monthRange,
  type BudgetCampaignBreakdown,
  type BudgetRow,
  type BudgetTotals,
  type GetBudgetResponse,
} from "@/lib/budget";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

interface CampaignSpend {
  name: string;
  raw: number;
}

interface SubReportLite {
  id: string;
  channel: string;
  name: string;
  campaignIds: string[];
}

interface SavedEntryLite {
  subReportId: string | null;
  channel: string;
  amount: number;
}

function buildChannelRows(
  channel: string,
  spendMap: Map<string, CampaignSpend>,
  subReports: SubReportLite[],
  savedEntries: SavedEntryLite[],
  rows: BudgetRow[]
) {
  const channelSubReports = subReports.filter((sr) => sr.channel === channel);

  function buildCampaigns(ids: string[]): BudgetCampaignBreakdown[] {
    return ids
      .map((id) => {
        const entry = spendMap.get(id);
        const raw = entry?.raw ?? 0;
        const spend = channel === "meta" ? grossUpMetaSpend(raw) : raw;
        return { id, name: entry?.name ?? `Campanha ${id}`, spend };
      })
      .sort((a, b) => b.spend - a.spend);
  }

  if (channelSubReports.length > 0) {
    for (const sr of channelSubReports) {
      const campaigns = buildCampaigns(sr.campaignIds);
      const saved = savedEntries.find((e) => e.subReportId === sr.id);
      rows.push({
        key: sr.id,
        subReportId: sr.id,
        channel,
        name: sr.name,
        isFallback: false,
        budgetAmount: saved?.amount ?? null,
        spent: campaigns.reduce((s, c) => s + c.spend, 0),
        campaigns,
      });
    }
  } else {
    const campaigns = buildCampaigns(Array.from(spendMap.keys()));
    const saved = savedEntries.find((e) => e.subReportId === null && e.channel === channel);
    rows.push({
      key: `fallback:${channel}`,
      subReportId: null,
      channel,
      name: `Total ${channelLabel(channel)}`,
      isFallback: true,
      budgetAmount: saved?.amount ?? null,
      spent: campaigns.reduce((s, c) => s + c.spend, 0),
      campaigns,
    });
  }
}

function computeTotals(rows: BudgetRow[]): GetBudgetResponse["totals"] {
  const byChannel: Record<string, BudgetTotals> = {};
  let overallBudget = 0;
  let overallSpent = 0;
  for (const row of rows) {
    const bucket = byChannel[row.channel] ?? (byChannel[row.channel] = { budget: 0, spent: 0 });
    bucket.budget += row.budgetAmount ?? 0;
    bucket.spent += row.spent;
    overallBudget += row.budgetAmount ?? 0;
    overallSpent += row.spent;
  }
  return { overall: { budget: overallBudget, spent: overallSpent }, byChannel };
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

  const subReports = await prisma.subReport.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  const savedEntries = await prisma.budgetEntry.findMany({
    where: { clientId, year, month },
  });

  const errors: GetBudgetResponse["errors"] = { google: null, meta: null };
  const rows: BudgetRow[] = [];

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
      buildChannelRows("google", map, subReports, savedEntries, rows);
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
      buildChannelRows("meta", map, subReports, savedEntries, rows);
    } catch (err) {
      errors.meta = err instanceof Error ? err.message : "Erro ao consultar Meta Ads API";
    }
  }

  const totals = computeTotals(rows);

  const response: GetBudgetResponse = { year, month, rows, totals, errors };
  return NextResponse.json(response);
}

const entrySchema = z.object({
  subReportId: z.string().nullable(),
  channel: z.string().min(1),
  amount: z.number().min(0),
});

const postSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  entries: z.array(entrySchema),
});

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
    for (const entry of entries) {
      const existing = await tx.budgetEntry.findFirst({
        where: { clientId, subReportId: entry.subReportId, year, month },
      });
      if (existing) {
        await tx.budgetEntry.update({
          where: { id: existing.id },
          data: { amount: entry.amount, channel: entry.channel },
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
