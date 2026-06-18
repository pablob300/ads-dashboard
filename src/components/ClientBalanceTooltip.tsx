'use client';

import { useEffect, useState } from 'react';

interface Balance {
  google: number | 'postpaid' | null;
  meta: number | null;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function ClientBalanceTooltip({ clientId }: { clientId: string }) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/balance`)
      .then((r) => r.json())
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (!loading && balance?.google == null && balance?.meta == null) return null;

  return (
    <div className="relative group inline-flex items-center ml-1.5">
      <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[9px] inline-flex items-center justify-center font-bold cursor-default select-none leading-none">
        i
      </span>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 hidden group-hover:block pointer-events-none">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
          {loading ? (
            <span className="text-gray-400">Carregando...</span>
          ) : (
            <>
              {balance?.google === 'postpaid' && (
                <div>Google: <span className="text-gray-400">Pós-paga</span></div>
              )}
              {balance?.google != null && balance.google !== 'postpaid' && (
                <div>Google: {formatBRL(balance.google)}</div>
              )}
              {balance?.meta != null && (
                <div>Meta: {formatBRL(balance.meta)}</div>
              )}
            </>
          )}
        </div>
        <div className="w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 mx-auto -mt-[5px]" />
      </div>
    </div>
  );
}
