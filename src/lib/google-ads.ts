const GOOGLE_ADS_API_VERSION = "v20";
const BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

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

  // Tenta buscar detalhes de cada conta — se falhar (token de teste), usa o ID como nome
  const chunks = chunkArray(resourceNames, 10);
  const allAccounts: GoogleAdsAccount[] = [];

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (resourceName) => {
        const customerId = resourceName.replace("customers/", "");
        try {
          return await getAccountDetails(customerId, accessToken);
        } catch {
          // Fallback: retorna conta com ID formatado (token de teste sem Basic Access)
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
    allAccounts.push(...results.filter((a): a is GoogleAdsAccount => a !== null));
  }

  return allAccounts;
}

async function getAccountDetails(
  customerId: string,
  accessToken: string
): Promise<GoogleAdsAccount> {
  const res = await fetch(`${BASE_URL}/customers/${customerId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get account ${customerId}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  return {
    customerId,
    descriptiveName: data.descriptiveName ?? `Conta ${customerId}`,
    currencyCode: data.currencyCode ?? "BRL",
    timeZone: data.timeZone ?? "America/Sao_Paulo",
    isManagerAccount: data.manager ?? false,
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
