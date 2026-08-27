import Link from "next/link";
import { getClientByToken } from "@/lib/share-token";
import { clientHasBudget } from "@/lib/budget-server";
import SharedBudget from "./shared-budget";

function Aviso({ titulo, texto, voltar }: { titulo: string; texto: string; voltar?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-xl font-bold text-slate-800 mb-2">{titulo}</h1>
      <p className="text-slate-500 text-sm max-w-xs">{texto}</p>
      {voltar && (
        <Link href={voltar} className="mt-4 text-sm text-blue-600 hover:text-blue-700 transition">
          Voltar ao relatório
        </Link>
      )}
    </div>
  );
}

export default async function SharedBudgetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await getClientByToken(token);

  if (!client) {
    return (
      <Aviso
        titulo="Link inválido ou expirado"
        texto="Este link de compartilhamento não existe ou foi revogado. Solicite um novo link ao responsável pelo dashboard."
      />
    );
  }

  // Mesma condição que decide se o botão aparece no relatório: sem nenhuma verba
  // cadastrada, esta tela não existe para o cliente. Também cobre a migration
  // pendente — `clientHasBudget` devolve false se a tabela não existir.
  if (!(await clientHasBudget(client.id))) {
    return (
      <Aviso
        titulo="Controle de Orçamento indisponível"
        texto="Ainda não há orçamento cadastrado para este cliente."
        voltar={`/share/${token}`}
      />
    );
  }

  return <SharedBudget clientName={client.name} token={token} />;
}
