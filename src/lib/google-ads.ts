// Cada versão da API vive ~9 meses. Quando fizer sunset, a API responde
// UNSUPPORTED_VERSION ("Version vXX is deprecated") em toda chamada.
// Único lugar onde a versão é definida — os outros módulos importam daqui.
// GOOGLE_ADS_API_VERSION no .env permite trocar a versão sem mexer no código.
export const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v25";
export const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

const BASE_URL = GOOGLE_ADS_BASE_URL;

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.error ?? "unknown"}`);
  }
  return data.access_token;
}

export async function getValidAccessToken(tokens: TokenSet): Promise<string> {
  // Renova se expirar em menos de 5 minutos
  const expiresAt = new Date(tokens.expiresAt);
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() < expiresAt.getTime() - fiveMinutes) {
    return tokens.accessToken;
  }
  return refreshAccessToken(tokens.refreshToken);
}

export interface GoogleAdsAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  isManagerAccount: boolean;
  mccId?: string;
  mccName?: string;
}

export async function listAccessibleAccounts(tokens: TokenSet): Promise<GoogleAdsAccount[]> {
  const accessToken = await getValidAccessToken(tokens);

  const res = await fetch(`${BASE_URL}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    },
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error("Google Ads API listAccessibleCustomers error:", raw.slice(0, 300));
    throw new Error(`Google Ads API returned ${res.status}`);
  }

  let data: { resourceNames?: string[] };
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Non-JSON response from listAccessibleCustomers:", raw.slice(0, 300));
    throw new Error("Resposta inválida da API do Google Ads");
  }

  const resourceNames: string[] = data.resourceNames ?? [];

  const chunks = chunkArray(resourceNames, 10);
  const topLevelAccounts: GoogleAdsAccount[] = [];

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (resourceName) => {
        const customerId = resourceName.replace("customers/", "");
        try {
          return await getAccountDetails(customerId, accessToken);
        } catch {
          return {
            customerId,
            descriptiveName: formatCustomerId(customerId),
            currencyCode: "BRL",
            timeZone: "America/Sao_Paulo",
            isManagerAccount: false,
          } as GoogleAdsAccount;
        }
      })
    );
    topLevelAccounts.push(...results.filter((a): a is GoogleAdsAccount => a !== null));
  }

  // Expande contas MCC: busca os filhos e os adiciona com mccId/mccName
  const childIds = new Set<string>();
  const mccChildren: GoogleAdsAccount[] = [];

  await Promise.all(
    topLevelAccounts
      .filter((a) => a.isManagerAccount)
      .map(async (mcc) => {
        try {
          const children = await listMccChildAccounts(mcc.customerId, accessToken);
          children.forEach((child) => {
            childIds.add(child.customerId);
            mccChildren.push({ ...child, mccId: mcc.customerId, mccName: mcc.descriptiveName });
          });
        } catch {
          // MCC sem filhos acessíveis — mantém a conta MCC como estava
        }
      })
  );

  // Resultado final: MCCs + seus filhos + contas standalone não duplicadas
  const final: GoogleAdsAccount[] = [];
  for (const account of topLevelAccounts) {
    if (account.isManagerAccount) {
      final.push(account);
      final.push(...mccChildren.filter((c) => c.mccId === account.customerId));
    } else if (!childIds.has(account.customerId)) {
      final.push(account);
    }
  }

  return final;
}

async function listMccChildAccounts(
  mccCustomerId: string,
  accessToken: string
): Promise<GoogleAdsAccount[]> {
  const res = await fetch(`${BASE_URL}/customers/${mccCustomerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "login-customer-id": mccCustomerId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.manager, customer_client.level FROM customer_client WHERE customer_client.level = 1 AND customer_client.manager = false",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list MCC children for ${mccCustomerId}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  const results: Record<string, unknown>[] = data.results ?? [];

  return results.map((r) => {
    const cc = (r.customerClient ?? {}) as Record<string, unknown>;
    const id = String(cc.id ?? "");
    return {
      customerId: id,
      descriptiveName: (cc.descriptiveName as string) || `Conta ${formatCustomerId(id)}`,
      currencyCode: (cc.currencyCode as string) ?? "BRL",
      timeZone: (cc.timeZone as string) ?? "America/Sao_Paulo",
      isManagerAccount: false,
    };
  });
}

async function getAccountDetails(
  customerId: string,
  accessToken: string
): Promise<GoogleAdsAccount> {
  const res = await fetch(`${BASE_URL}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get account ${customerId}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  const customer = (data.results?.[0]?.customer ?? {}) as Record<string, unknown>;

  return {
    customerId,
    descriptiveName: (customer.descriptiveName as string) || `Conta ${formatCustomerId(customerId)}`,
    currencyCode: (customer.currencyCode as string) ?? "BRL",
    timeZone: (customer.timeZone as string) ?? "America/Sao_Paulo",
    isManagerAccount: (customer.manager as boolean) ?? false,
  };
}

export function formatCustomerId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return id;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
