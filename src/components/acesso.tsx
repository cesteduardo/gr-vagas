import type { ReactNode } from 'react';
import { Simbolo } from './marca';

// Moldura das telas de entrar e criar conta: um lado de boas-vindas, outro com o formulário.
export function Acesso({ titulo, cinza, itens, children }: { titulo: string; cinza: string; itens: string[]; children: ReactNode }) {
  return (
    <main className="pagina embrulho">
      <div className="acesso">
        <aside className="acesso-lado" aria-hidden="true">
          <Simbolo tamanho={56} />
          <p className="acesso-titulo">{titulo} <em>{cinza}</em></p>
          <ul>{itens.map((i) => <li key={i}>{i}</li>)}</ul>
        </aside>
        <div className="acesso-form">{children}</div>
      </div>
    </main>
  );
}
