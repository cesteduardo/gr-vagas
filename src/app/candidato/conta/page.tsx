import { BASE } from '@/lib/base';
import type { Metadata } from 'next';
import { FormSenha } from '@/components/form-simples';
import { FormExcluirConta } from '@/components/forms-painel';
import { temSenha } from '@/lib/auth/contas';
import { exigirCandidato } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { formatarTelefone } from '@/lib/forms/validators';

export const metadata: Metadata = { title: 'Conta e senha' };

export default async function Conta() {
  const u = await exigirCandidato();
  return (
    <div className="pilha" style={{ maxWidth: 680 }}>
      <h1 className="titulo-painel">Conta e senha</h1>
      <dl className="vaga-fatos" style={{ margin: 0 }}>
        <div><dt>Nome</dt><dd>{u.nome}</dd></div>
        <div><dt>E-mail</dt><dd>{u.email}</dd></div>
        <div><dt>WhatsApp</dt><dd>{formatarTelefone(u.telefone)}</dd></div>
      </dl>
      <FormSenha tem={await temSenha(await banco(), u.id)} />
      <div className="painel-caixa pilha">
        <h2 style={{ fontSize: 24 }}>Seus dados</h2>
        <p><a href={`${BASE}/api/meus-dados`}>Baixar meus dados</a></p>
        <details>
          <summary style={{ cursor: 'pointer', minHeight: 44, paddingBlock: 10 }}>Excluir minha conta</summary>
          <p className="leve" style={{ marginBlock: 8 }}>Apaga de vez os dados da conta. Não dá para desfazer.</p>
          <FormExcluirConta />
        </details>
      </div>
    </div>
  );
}
