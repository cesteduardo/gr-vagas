import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Abas } from '@/components/abas';
import { FormReenviar } from '@/components/form-simples';
import { Rodape, Topo } from '@/components/moldura';
import { exigirCandidato } from '@/lib/auth/sessao';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CandidatoLayout({ children }: { children: ReactNode }) {
  const u = await exigirCandidato();
  return (
    <>
      <Topo />
      <main className="pagina embrulho">
        <div className="app">
          <aside className="app-menu">
            <p className="app-ola">Olá, {u.nome.split(' ')[0]}</p>
            <Abas rotulo="Sua conta" itens={[{ href: '/candidato', nome: 'Início', raiz: true }, { href: '/candidato/conversas', nome: 'Conversas' }, { href: '/candidato/perfil', nome: 'Perfil e arquivo' }, { href: '/candidato/curriculo', nome: 'Currículo pronto' }, { href: '/candidato/salvas', nome: 'Vagas salvas' }, { href: '/candidato/alertas', nome: 'Alertas' }, { href: '/candidato/plano', nome: 'Plano' }, { href: '/candidato/conta', nome: 'Conta e senha' }]} />
          </aside>
          <div className="app-conteudo">
            {u.confirmado ? null : (
              <div className="aviso aviso-linha">
                <p><strong>Confirme seu e-mail</strong> para voltar à sua conta de outros aparelhos. Enviamos o link para {u.email}.</p>
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
