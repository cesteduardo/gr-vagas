'use client';

import { useState } from 'react';

export function BotaoCopiar({ texto, rotulo = 'Copiar', copiado = 'Copiado' }: { texto: string; rotulo?: string; copiado?: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button type="button" className="btn btn-claro btn-peq" onClick={async () => { try { await navigator.clipboard.writeText(texto); setFeito(true); } catch { setFeito(false); } }}>
      {feito ? copiado : rotulo}
    </button>
  );
}
