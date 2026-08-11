import { compareChannels } from "./channels";

/**
 * Sub-relatório como a API entrega e a UI consome.
 *
 * No banco as campanhas ficam normalizadas em `sub_report_campaigns` (uma linha
 * por campanha, com o canal). Aqui elas vêm agrupadas por canal, que é a forma
 * que a UI realmente usa: `new Set(campaignIdsFor(sr, "google"))`.
 */
export interface SubReport {
  id: string;
  clientId: string;
  name: string;
  campaignsByChannel: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

/** Campanhas do sub-relatório num canal. [] se o sub-relatório não tem nada naquele canal. */
export function campaignIdsFor(subReport: SubReport, channel: string): string[] {
  return subReport.campaignsByChannel[channel] ?? [];
}

/** Total de campanhas vinculadas, somando todos os canais. */
export function totalCampaignCount(byChannel: Record<string, string[]>): number {
  return Object.values(byChannel).reduce((sum, ids) => sum + ids.length, 0);
}

/** Linhas de `sub_report_campaigns` → mapa por canal, com os canais em ordem canônica. */
export function groupCampaignsByChannel(
  rows: { channel: string; campaignId: string }[]
): Record<string, string[]> {
  const byChannel: Record<string, string[]> = {};
  for (const row of rows) {
    (byChannel[row.channel] ??= []).push(row.campaignId);
  }
  return Object.fromEntries(
    Object.entries(byChannel).sort(([a], [b]) => compareChannels(a, b))
  );
}

/** Mapa por canal → linhas para gravar em `sub_report_campaigns`. Ignora canais vazios. */
export function flattenCampaignsByChannel(
  byChannel: Record<string, string[]>
): { channel: string; campaignId: string }[] {
  const rows: { channel: string; campaignId: string }[] = [];
  for (const [channel, ids] of Object.entries(byChannel)) {
    for (const campaignId of new Set(ids)) {
      rows.push({ channel, campaignId });
    }
  }
  return rows;
}
