// Registro único dos canais de mídia da dashboard.
// Adicionar um canal novo começa aqui — ver o fim deste arquivo para o que
// ainda precisa ser feito à mão além de registrar a entrada.

/** Meta reporta o gasto sem o imposto de 12,15% que incide sobre a verba (= 1 - 0,1215). */
export const META_TAX_GROSS_UP_DIVISOR = 0.8785;

export interface ChannelDef {
  key: string;
  label: string;
  /** Divisor de gross-up de imposto. Ausente = o gasto reportado já é o efetivo. */
  taxDivisor?: number;
  /** Endpoint que lista TODAS as campanhas do canal para um cliente (sem filtro de período). */
  allCampaignsPath: (clientId: string) => string;
}

export const CHANNELS: ChannelDef[] = [
  {
    key: "google",
    label: "Google",
    allCampaignsPath: (clientId) => `/api/clients/${clientId}/campaigns/all`,
  },
  {
    key: "meta",
    label: "Meta",
    taxDivisor: META_TAX_GROSS_UP_DIVISOR,
    allCampaignsPath: (clientId) => `/api/clients/${clientId}/meta-campaigns/all`,
  },
];

/** Ordem canônica dos canais — usada para ordenar colunas, seções e selects. */
export const CHANNEL_KEYS: string[] = CHANNELS.map((c) => c.key);

export function getChannel(key: string): ChannelDef | undefined {
  return CHANNELS.find((c) => c.key === key);
}

export function channelLabel(key: string): string {
  return getChannel(key)?.label ?? key;
}

export function isKnownChannel(key: string): boolean {
  return CHANNEL_KEYS.includes(key);
}

/**
 * Converte o gasto bruto reportado pelo canal no gasto efetivo.
 * Único lugar do código onde o gross-up de imposto deve acontecer.
 */
export function grossUpSpend(rawSpend: number, channel: string): number {
  const divisor = getChannel(channel)?.taxDivisor;
  return divisor ? rawSpend / divisor : rawSpend;
}

/** Ordena chaves de canal pela ordem de CHANNELS; desconhecidos vão para o fim, em ordem alfabética. */
export function compareChannels(a: string, b: string): number {
  const rank = (c: string) => {
    const i = CHANNEL_KEYS.indexOf(c);
    return i === -1 ? CHANNEL_KEYS.length : i;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}

// Ainda manual para um canal novo, além da entrada em CHANNELS:
//   - a lib de fetch do canal (ex: src/lib/<canal>-campaigns.ts)
//   - a rota /api/clients/[id]/<canal>-campaigns/all
//   - o bloco que monta o spendMap do canal em /api/clients/[id]/budget/route.ts
//   - um componente de aba no dashboard
// O modelo de sub-relatório e o de orçamento não precisam mudar.
