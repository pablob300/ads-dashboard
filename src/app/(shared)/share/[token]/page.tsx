import { getClientByToken } from "@/lib/share-token";
import { clientHasBudget } from "@/lib/budget-server";
import SharedDashboard from "./shared-dashboard";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await getClientByToken(token);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Link inválido ou expirado</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          Este link de compartilhamento não existe ou foi revogado. Solicite um novo link ao responsável pelo dashboard.
        </p>
      </div>
    );
  }

  // Sem verba cadastrada em nenhum mês, o cliente nem vê a entrada do Controle
  // de Orçamento — mesma condição usada em share/[token]/budget/page.tsx.
  const hasBudget = await clientHasBudget(client.id);

  return <SharedDashboard client={client} token={token} hasBudget={hasBudget} />;
}
