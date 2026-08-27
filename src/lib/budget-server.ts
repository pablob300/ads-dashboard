/**
 * Montagem da resposta do Controle de Orçamento — só servidor.
 *
 * Vive fora das rotas porque duas as consomem: a autenticada
 * (`/api/clients/[id]/budget`) e a pública do link compartilhado
 * (`/api/share/[token]/budget`), que é somente leitura. Duplicar o cálculo de
 * gasto nas duas seria a forma mais fácil de o número do cliente divergir do
 * nosso.
 *
 * `budget.ts` continua sendo o módulo de tipos, importado também por componentes
 * client — nada daqui pode ir para lá, porque isto puxa Prisma e as APIs de anúncio.
 */

import { prisma } from "./prisma";
import { fetchCampaignData } from "./google-ads-campaigns";
import { fetchMetaCampaignData } from "./meta-ads-campaigns";
import { monthRange, type BudgetEntryRow, type GetBudgetResponse } from "./budget";
import { channelLabel, grossUpSpend } from "./channels";
import { groupCampaignsByChannel } from "./sub-reports";

interface CampaignSpend {
  name: string;
  raw: number;
}

/** Só o que o cálculo precisa de cada conta vinculada. */
export interface BudgetAccounts {
  google: { connectionId: string; customerId: string }[];
  meta: { connectionId: string; accountId: string }[];
}

/**
 * Gasto real do período, por campanha, em cada canal.
 *
 * As conexões são resolvidas por `connectionId` da própria conta, e não por
 * `userId`: a rota pública não tem sessão, e a conta já vem de um cliente
 * validado — pelo token, no caso do link, ou pelo `userId` na rota autenticada.
 *
 * Um canal que falha preenche `errors[canal]` e deixa o outro seguir; um erro no
 * Meta não pode derrubar as linhas do Google.
 */
async function collectSpend(accounts: BudgetAccounts, start: Date, end: Date) {
  const errors: GetBudgetResponse["errors"] = { google: null, meta: null };
  const spendMaps: Record<string, Map<string, CampaignSpend>> = {};

  if (accounts.google.length > 0) {
    try {
      const results = await Promise.all(
        accounts.google.map(async (account) => {
          const conn = await prisma.googleConnection.findUnique({ where: { id: account.connectionId } });
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

  if (accounts.meta.length > 0) {
    try {
      const results = await Promise.all(
        accounts.meta.map(async (account) => {
          const conn = await prisma.metaConnection.findUnique({ where: { id: account.connectionId } });
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

  return { spendMaps, errors };
}

/**
 * Resposta completa do Controle de Orçamento de um mês: as verbas salvas, com o
 * gasto real já resolvido e com o imposto do Meta aplicado por `grossUpSpend`.
 */
export async function buildBudgetResponse(
  clientId: string,
  accounts: BudgetAccounts,
  year: number,
  month: number
): Promise<GetBudgetResponse> {
  const { start, end } = monthRange(year, month);

  const [subReportsRaw, savedEntries] = await Promise.all([
    prisma.subReport.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
      include: { campaigns: true },
    }),
    prisma.budgetEntry.findMany({ where: { clientId, year, month } }),
  ]);

  const availableChannels: string[] = [];
  if (accounts.google.length > 0) availableChannels.push("google");
  if (accounts.meta.length > 0) availableChannels.push("meta");

  const { spendMaps, errors } = await collectSpend(accounts, start, end);

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

  return {
    year,
    month,
    subReports: subReportsRaw.map((sr) => ({ id: sr.id, name: sr.name })),
    availableChannels,
    entries,
    errors,
  };
}

/**
 * Se o cliente já tem alguma verba cadastrada, em qualquer mês. É o que decide se
 * o link compartilhado mostra a entrada para o Controle de Orçamento.
 *
 * Devolve `false` quando a tabela ainda não existe (migration pendente no
 * Supabase): o cliente simplesmente não vê a opção, em vez de receber um erro.
 */
export async function clientHasBudget(clientId: string): Promise<boolean> {
  try {
    return (await prisma.budgetEntry.count({ where: { clientId } })) > 0;
  } catch {
    return false;
  }
}
