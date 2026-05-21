export const META_API_VERSION = "v21.0";
export const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaTokens {
  accessToken: string;
  expiresAt: Date | null;
}

export interface MetaAdAccountInfo {
  accountId: string;    // act_XXXXXXXXX
  name: string;
  currency: string;
  timezone: string;
  connectionId: string;
  metaEmail: string | null;
}

/** Troca token curto por token longo (60 dias) */
export async function exchangeLongLivedToken(shortToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const url = new URL(`${META_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Falha ao trocar token Meta");
  return res.json();
}

/** Busca informações do usuário Meta */
export async function getMetaUserInfo(token: string): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const res = await fetch(
    `${META_BASE}/me?fields=id,name&access_token=${token}`
  );
  if (!res.ok) throw new Error("Falha ao buscar usuário Meta");
  return res.json();
}

/** Lista contas de anúncio acessíveis */
export async function listMetaAdAccounts(tokens: MetaTokens): Promise<MetaAdAccountInfo[]> {
  const res = await fetch(
    `${META_BASE}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&limit=200&access_token=${tokens.accessToken}`
  );

  if (!res.ok) return [];

  const data = await res.json();
  const accounts = (data.data ?? []) as {
    id: string;
    name: string;
    currency: string;
    timezone_name: string;
    account_status: number;
  }[];

  return accounts
    .filter((a) => a.account_status === 1) // 1 = ativo
    .map((a) => ({
      accountId: a.id,
      name: a.name || a.id,
      currency: a.currency || "BRL",
      timezone: a.timezone_name || "America/Sao_Paulo",
      connectionId: "",
      metaEmail: null,
    }));
}
