'use client';

import { useState } from 'react';

interface GoogleAccountBalance {
  name: string;
  balance: number | 'postpaid';
}

interface MetaAccountBalance {
  name: string;
  balance: number;
}

interface Balance {
  googleAccounts: GoogleAccountBalance[] | null;
  metaAccounts: MetaAccountBalance[] | null;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function ClientBalanceTooltip({
  clientId,
  direction = 'up',
}: {
  clientId: string;
  direction?: 'up' | 'down';
}) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  function handleMouseEnter() {
    if (fetched) return;
    setFetched(true);
    setLoading(true);
    fetch(`/api/clients/${clientId}/balance`)
      .then((r) => r.json())
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }

  if (fetched && !loading && balance?.googleAccounts == null && balance?.metaAccounts == null) return null;

  const multiGoogle = (balance?.googleAccounts?.length ?? 0) > 1;
  const multiMeta = (balance?.metaAccounts?.length ?? 0) > 1;

  const content = (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
      {loading ? (
        <span className="text-gray-400">Carregando...</span>
      ) : (
        <>
          {balance?.googleAccounts?.map((acc, i) => (
            <div key={i}>
              <span>{multiGoogle ? `Google - ${acc.name}: ` : 'Google: '}</span>
              {acc.balance === 'postpaid'
                ? <span className="text-gray-400">Pós-paga</span>
                : <span>{formatBRL(acc.balance)}</span>
              }
            </div>
          ))}
          {balance?.metaAccounts?.map((acc, i) => (
            <div key={i}>
              {multiMeta ? `Meta - ${acc.name}: ` : 'Meta: '}
              {formatBRL(acc.balance)}
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="relative group inline-flex items-center ml-1.5" onMouseEnter={handleMouseEnter}>
      <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[9px] inline-flex items-center justify-center font-bold cursor-default select-none leading-none">
        i
      </span>
      <div className={`absolute left-1/2 -translate-x-1/2 z-[9999] hidden group-hover:block pointer-events-none ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
        {direction === 'down' && (
          <div className="w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45 mx-auto -mb-[5px]" />
        )}
        {content}
        {direction === 'up' && (
          <div className="w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 mx-auto -mt-[5px]" />
        )}
      </div>
    </div>
  );
}
