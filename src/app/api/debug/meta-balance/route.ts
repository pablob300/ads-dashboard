import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { META_BASE } from "@/lib/meta-ads";
import { NextResponse } from "next/server";

// Endpoint temporário de debug — remove após identificar o campo correto
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      metaAdAccounts: { include: { connection: true } },
    },
  });

  const results = [];

  for (const client of clients) {
    for (const acc of client.metaAdAccounts) {
      const fields = "balance,amount_spent,currency,spend_cap,funding_source_details,account_status";
      const url = `${META_BASE}/${acc.accountId}?fields=${fields}&access_token=${acc.connection.accessToken}`;
      try {
        const res = await fetch(url);
        const raw = await res.json();
        results.push({
          clientName: client.name,
          accountId: acc.accountId,
          accountName: acc.name,
          rawApiResponse: raw,
          parsedBalance: raw.balance != null ? parseFloat(raw.balance) : null,
          parsedBalance_div100: raw.balance != null ? parseFloat(raw.balance) / 100 : null,
        });
      } catch (e) {
        results.push({ clientName: client.name, accountId: acc.accountId, error: String(e) });
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
