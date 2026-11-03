'use client';

import Link from 'next/link';
import { useState } from 'react';
import { acaoCandidatar } from '@/app/acoes';
import { destinoDaArte } from '@/lib/arte/dados';
import { ARTE_PADRAO } from '@/lib/arte/modelos';
import { CIDADE_PRINCIPAL } from '@/lib/config';
import { errosPessoa } from '@/lib/forms/vaga';
import type { DadosCurriculo } from '@/lib/ia/curriculo';
import { ArteCanvas } from './arte-canvas';
import { aria, AvisoLink, Campo, CampoEmail, CampoNome, CampoTelefone, pega, useFormulario } from './formulario-base';
import { validarSenha } from '@/lib/forms/validators';
import { SoltarCurriculo, type VagaSugerida } from './soltar-curriculo';

// Quem procura emprego: um arquivo basta. O formulário já traz os dados e as vagas.
export function PortaCandidato() {
  const fm = useFormulario(acaoCandidatar, (f) => ({ ...errosPessoa({ nome: pega(f, 'nome'), email: pega(f, 'email'), telefone: pega(f, 'telefone') }), senha: validarSenha(pega(f, 'senha')) }));
  const [d, setD] = useState<DadosCurriculo | null>(null);
  const [vagas, setVagas] = useState<VagaSugerida[]>([]);
  const [versao, setVersao] = useState(0);
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="porta porta-pessego">
      <h2>Procuro emprego</h2>
      <p className="porta-sub">Solte o currículo: seus dados se preenchem sozinhos e as vagas que combinam aparecem na hora.</p>
      <input type="hidden" name="titulo" value={d?.titulo ?? ''} />
      <input type="hidden" name="resumo" value={d?.resumo ?? ''} />
      <input type="hidden" name="cidadeSlug" value={d?.cidadeSlug ?? ''} />
      <SoltarCurriculo titulo="Solte seu currículo aqui" detalhe="PDF de até 3 MB. Nada fica guardado até você se candidatar." aoLer={(dados, lista) => { setD(dados); setVagas(lista); setVersao((v) => v + 1); }} />
      {d ? (
        <div className="porta-resultado">
          {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
          <AvisoLink estado={fm.estado} />
          <p className="bloco-rotulo" style={{ margin: 0 }}>Confira seus dados</p>
          <div key={versao} className="pilha" style={{ gap: 12 }}>
            <CampoNome erro={fm.erros.nome} inicial={d.nome} />
            <CampoTelefone erro={fm.erros.telefone} inicial={d.telefone} />
            <CampoEmail erro={fm.erros.email} inicial={d.email} />
            <Campo rotulo="Crie uma senha para sua conta" erro={fm.erros.senha} nome="senha">
              <input type="password" name="senha" autoComplete="new-password" {...aria('senha', fm.erros.senha)} />
            </Campo>
          </div>
          <p className="bloco-rotulo" style={{ margin: '8px 0 0' }}>{vagas.length ? 'Vagas que combinam com você' : 'Ainda não há vagas abertas'}</p>
          {vagas.length ? (
            <ul className="sugeridas">
              {vagas.map((v) => (
                <li key={v.id}>
                  <div>
                    <Link href={`/vagas/${v.slug}`} target="_blank">{v.titulo}</Link>
                    <small>{v.empresa}, {v.cidade}. {v.salario}.</small>
                  </div>
                  <button className="btn btn-peq" name="vagaId" value={v.id} disabled={fm.pendente}>Candidatar-me</button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="porta-rodape"><Link href="/vagas">Ou pesquise as vagas</Link> ou <Link href="/entrar">Já tenho conta</Link></p>
      )}
    </form>
  );
}

// Quem contrata: digitou o cargo, a arte já existe.
export function PortaEmpresa({ link }: { link: string }) {
  const [titulo, setTitulo] = useState('');
  const destino = `/publicar${titulo.trim() ? `?titulo=${encodeURIComponent(titulo.trim())}` : ''}`;
  const nome = titulo.trim() || 'Auxiliar administrativo';
  return (
    <div className="porta porta-ceu">
      <h2>Tenho uma vaga</h2>
      <p className="porta-sub">Escreva o cargo. A arte com QR Code já vai nascendo, do seu jeito.</p>
      <div className="busca-pilula porta-campo">
        <label className="so-leitor" htmlFor="cargo-home">Cargo da vaga</label>
        <input id="cargo-home" type="text" value={titulo} maxLength={80} placeholder="Qual é o cargo?" onChange={(e) => setTitulo(e.target.value)} />
        <Link className="btn btn-peq" href={destino}>Publicar esta vaga</Link>
      </div>
      <div className="porta-arte">
        <ArteCanvas
          rotulo="Prévia da arte da vaga"
          dados={{ titulo: nome, empresa: 'Sua empresa', cidade: `${CIDADE_PRINCIPAL.nome} - ${CIDADE_PRINCIPAL.uf}`, contrato: 'CLT', modalidade: 'Presencial', salario: 'A combinar', destaques: ['Vale-transporte', 'Vale-refeição'], ...destinoDaArte(link, 'vaga', '', nome) }}
          opcoes={{ modelo: 'cartao', formato: 'feed', fundo: '#FFFFFF', destaque: ARTE_PADRAO.destaque, texto: ARTE_PADRAO.texto, chamada: ARTE_PADRAO.chamada, marca: false, fonte: 'inter', qrEstilo: 'suave' }}
        />
      </div>
    </div>
  );
}
