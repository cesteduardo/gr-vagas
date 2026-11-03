'use client';

import Link from 'next/link';
import { LinkLegal } from './legal';
import { TextoPrivacidade, TextoTermos } from './textos-legais';
import { useState } from 'react';
import { acaoCandidatar } from '@/app/acoes';
import { errosPessoa } from '@/lib/forms/vaga';
import { validarSenha } from '@/lib/forms/validators';
import type { DadosCurriculo } from '@/lib/ia/curriculo';
import { aria, AvisoLink, Campo, CampoEmail, CampoNome, CampoTelefone, pega, useFormulario } from './formulario-base';
import { SoltarCurriculo } from './soltar-curriculo';

export function FormCandidatura({ vagaId, slug }: { vagaId: string; slug: string }) {
  const fm = useFormulario(acaoCandidatar, (f) => ({ ...errosPessoa({ nome: pega(f, 'nome'), email: pega(f, 'email'), telefone: pega(f, 'telefone') }), senha: validarSenha(pega(f, 'senha')) }));
  const [d, setD] = useState<DadosCurriculo | null>(null);
  const [versao, setVersao] = useState(0);
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha">
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <AvisoLink estado={fm.estado} />
      <input type="hidden" name="vagaId" value={vagaId} />
      <input type="hidden" name="titulo" value={d?.titulo ?? ''} />
      <input type="hidden" name="resumo" value={d?.resumo ?? ''} />
      <input type="hidden" name="cidadeSlug" value={d?.cidadeSlug ?? ''} />
      <SoltarCurriculo titulo="Solte seu currículo em PDF" detalhe="A gente preenche tudo para você. Se preferir, digite abaixo." aoLer={(dados) => { setD(dados); setVersao((v) => v + 1); }} />
      <div key={versao} className="pilha">
        <CampoNome erro={fm.erros.nome} inicial={d?.nome} />
        <CampoTelefone erro={fm.erros.telefone} inicial={d?.telefone} />
        <CampoEmail erro={fm.erros.email} inicial={d?.email} />
        <Campo rotulo="Crie uma senha" erro={fm.erros.senha} nome="senha">
        <input type="password" name="senha" autoComplete="new-password" {...aria('senha', fm.erros.senha)} />
      </Campo>
      </div>
      <button className="btn" disabled={fm.pendente}>{fm.pendente ? 'Enviando…' : 'Criar conta e candidatar-me'}</button>
      <p className="nota">Já tem conta? <Link href={`/entrar?destino=/vagas/${slug}`}>Entre para se candidatar</Link>. Seus dados vão só para esta empresa, e é sempre grátis. Veja a <LinkLegal rotulo="Política de privacidade" titulo="Política de privacidade"><TextoPrivacidade /></LinkLegal>.</p>
    </form>
  );
}
