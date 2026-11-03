import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Abas } from '@/components/abas';
import { FormReenviar } from '@/components/form-simples';
import { Rodape, Topo } from '@/components/moldura';
import { exigirContratante } from '@/lib/auth/sessao';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PainelLayout({ children }: { children: ReactNode }) {
  const u = await exigirContratante();
  return (
    <>
      <Topo />
      <main className="pagina embrulho">
        <div className="app">
          <aside className="app-menu">
            <p className="app-ola">Olá, {u.nome.split(' ')[0]}</p>
            <Abas rotulo="Painel da empresa" itens={[{ href: '/painel', nome: 'Início', raiz: true }, { href: '/painel/empresa', nome: 'Empresa' }, { href: '/painel/talentos', nome: 'Banco de talentos' }, { href: '/painel/plano', nome: 'Plano' }, { href: '/painel/conta', nome: 'Conta e senha' }]} />
          </aside>
          <div className="app-conteudo">
            {u.confirmado ? null : (
              <div className="aviso aviso-linha">
                <p><strong>Confirme seu e-mail para as vagas aparecerem na busca.</strong> A arte e o link já funcionam. Enviamos a confirmação para {u.email}.</p>
                <FormReenviar />
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
      <Rodape />
    </>
  );
}
