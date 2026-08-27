import { getClientByToken } from "@/lib/share-token";
import { buildBudgetResponse } from "@/lib/budget-server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Controle de Orçamento do link compartilhado — somente leitura.
 *
 * Só existe o GET de propósito: o cliente vê os orçamentos, nunca cria nem edita.
 * O POST continua exclusivo da rota autenticada `/api/clients/[id]/budget`.
 *
 * O cálculo é o mesmo `buildBudgetResponse` da rota interna, então o número que o
 * cliente vê não tem como divergir do nosso.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await getClientByToken(token);
    if (!client) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });

    const { searchParams } = req.nextUrl;
    const today = new Date();
    const year = Number(searchParams.get("year")) || today.getFullYear();
    const month = Number(searchParams.get("month")) || today.getMonth() + 1;

    const response = await buildBudgetResponse(
      client.id,
      {
        google: client.googleAdAccounts.map((a) => ({ connectionId: a.connectionId, customerId: a.customerId })),
        meta: client.metaAdAccounts.map((a) => ({ connectionId: a.connectionId, accountId: a.accountId })),
      },
      year,
      month
    );

    // `subReports` e `availableChannels` só servem para montar os selects do
    // formulário interno; o link compartilhado não tem formulário, então não vão.
    return NextResponse.json({
      year: response.year,
      month: response.month,
      entries: response.entries,
      errors: response.errors,
    });
  } catch (err) {
    console.error("share budget error:", err);
    return NextResponse.json({ error: "Erro ao carregar o Controle de Orçamento." }, { status: 500 });
  }
}
