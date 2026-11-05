import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Abas } from '@/components/abas';
import { Rodape, Topo } from '@/components/moldura';
import { exigirAdmin } from '@/lib/auth/sessao';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Administração geral do GR Vagas: o espaço pago da tela inicial e a moderação.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await exigirAdmin();
  return (
    <>
      <Topo />
      <main className="pagina embrulho">
        <div className="app">
          <aside className="app-menu">
            <p className="app-ola">Administração</p>
            <Abas rotulo="Administração" itens={[{ href: '/admin', nome: 'Tela inicial', raiz: true }, { href: '/admin/denuncias', nome: 'Denúncias' }]} />
          </aside>
          <div className="app-conteudo">{children}</div>
        </div>
      </main>
      <Rodape />
    </>
  );
}
