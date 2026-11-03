'use client';

import Link from 'next/link';
import { LinkLegal } from './legal';
import { TextoPrivacidade, TextoTermos } from './textos-legais';
import { useState } from 'react';
import { acaoCriarConta, acaoDefinirSenha, acaoDenunciar, acaoEntrar, acaoEntrarSenha, acaoReenviar } from '@/app/acoes';
import { REGRAS_SENHA, validarEmail, validarNome, validarSenha, validarTelefone } from '@/lib/forms/validators';
import { AvisoLink, aria, Campo, CampoEmail, CampoNome, CampoTelefone, pega, useFormulario } from './formulario-base';

function CampoSenha({ erro, nova }: { erro?: string; nova?: boolean }) {
  const [v, setV] = useState('');
  const [ver, setVer] = useState(false);
  return (
    <Campo rotulo="Senha" erro={erro} nome="senha">
      <span className="senha-linha">
        <input type={ver ? 'text' : 'password'} name="senha" autoComplete={nova ? 'new-password' : 'current-password'} value={v} onChange={(e) => setV(e.target.value)} {...aria('senha', erro)} />
        <button type="button" className="btn btn-claro btn-peq" aria-pressed={ver} onClick={() => setVer((a) => !a)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
      </span>
      {nova ? <span className="nota">{REGRAS_SENHA.map((r) => r.rotulo).join(', ')}.</span> : null}
    </Campo>
  );
}

export function FormEntrar({ destino }: { destino: string }) {
  const fm = useFormulario(acaoEntrarSenha, (f) => ({ email: validarEmail(pega(f, 'email')), senha: pega(f, 'senha') ? null : 'Informe a senha.' }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha painel-caixa">
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <input type="hidden" name="destino" value={destino} />
      <CampoEmail erro={fm.erros.email} />
      <CampoSenha erro={fm.erros.senha} />
      <button className="btn" disabled={fm.pendente}>{fm.pendente ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

export function FormLink({ destino }: { destino: string }) {
  const fm = useFormulario(acaoEntrar, (f) => ({ email: validarEmail(pega(f, 'email')) }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha">
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <AvisoLink estado={fm.estado} />
      <input type="hidden" name="destino" value={destino} />
      <CampoEmail erro={fm.erros.email} />
      <div><button className="btn btn-claro" disabled={fm.pendente}>{fm.pendente ? 'Enviando…' : 'Receber link no e-mail'}</button></div>
    </form>
  );
}

function Regras({ senha }: { senha: string }) {
  return (
    <ul className="regras-senha" aria-label="Regras da senha">
      {REGRAS_SENHA.map((r) => <li key={r.rotulo} className={r.ok(senha) ? 'ok' : undefined}>{r.rotulo}<span className="so-leitor">{r.ok(senha) ? ' (cumprido)' : ' (falta)'}</span></li>)}
    </ul>
  );
}

const TIPOS = [
  { id: 'candidato' as const, nome: 'Procuro emprego', texto: 'Candidate-se mais rápido, guarde vagas e receba alertas.', icone: 'M4 19c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5 M12 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8' },
  { id: 'contratante' as const, nome: 'Quero contratar', texto: 'Publique vagas, crie as artes e fale com os candidatos.', icone: 'M3.5 8h17v11h-17z M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8 M3.5 13h17' },
];

export function FormCriarConta({ tipoInicial, destino = '' }: { tipoInicial: 'candidato' | 'contratante'; destino?: string }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const fm = useFormulario(acaoCriarConta, (f) => ({
    nome: validarNome(pega(f, 'nome')),
    email: validarEmail(pega(f, 'email')),
    telefone: validarTelefone(pega(f, 'telefone')),
    senha: validarSenha(pega(f, 'senha')),
    empresa: tipo === 'contratante' && pega(f, 'empresa').trim().length < 2 ? 'Informe o nome da empresa.' : null,
  }));
  if (fm.estado.ok) return <div className="painel-caixa"><AvisoLink estado={fm.estado} /></div>;
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="form-conta">
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <input type="hidden" name="destino" value={destino} />
      <fieldset className="tipos-conta">
        <legend>Você quer</legend>
        {TIPOS.map((t) => (
          <label key={t.id} className="tipo-conta">
            <input className="so-leitor" type="radio" name="tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.icone} /></svg>
            <strong>{t.nome}</strong>
            <span>{t.texto}</span>
          </label>
        ))}
      </fieldset>
      <div className="painel-caixa form-conta-campos">
        {tipo === 'contratante' ? <div className="inteiro"><Campo rotulo="Nome da empresa" erro={fm.erros.empresa} nome="empresa"><input type="text" name="empresa" maxLength={80} autoComplete="organization" {...aria('empresa', fm.erros.empresa)} /></Campo></div> : null}
        <CampoNome erro={fm.erros.nome} />
        <CampoTelefone erro={fm.erros.telefone} />
        <div className="inteiro"><CampoEmail erro={fm.erros.email} /></div>
        <div className="inteiro">
          <Campo rotulo="Crie uma senha" erro={fm.erros.senha} nome="senha">
            <span className="senha-linha">
              <input type={ver ? 'text' : 'password'} name="senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} {...aria('senha', fm.erros.senha)} />
              <button type="button" className="btn btn-claro btn-peq" aria-pressed={ver} onClick={() => setVer((a) => !a)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
            </span>
          </Campo>
          <Regras senha={senha} />
        </div>
        <button className="btn inteiro" disabled={fm.pendente}>{fm.pendente ? 'Criando…' : tipo === 'contratante' ? 'Criar conta da empresa' : 'Criar minha conta'}</button>
        <p className="nota inteiro" style={{ textAlign: 'center' }}>Ao criar a conta, você aceita os <LinkLegal rotulo="Termos de uso" titulo="Termos de uso"><TextoTermos /></LinkLegal> e a <LinkLegal rotulo="Política de privacidade" titulo="Política de privacidade"><TextoPrivacidade /></LinkLegal>.</p>
      </div>
    </form>
  );
}

export function FormSenha({ tem }: { tem: boolean }) {
  const fm = useFormulario(acaoDefinirSenha, (f) => ({ senha: validarSenha(pega(f, 'senha')) }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha painel-caixa">
      <h2 style={{ fontSize: 24 }}>{tem ? 'Trocar senha' : 'Criar senha'}</h2>
      {tem ? null : <p className="leve">Hoje você entra pelo link do e-mail. Com uma senha, fica mais rápido.</p>}
      <AvisoLink estado={fm.estado} />
      <CampoSenha erro={fm.erros.senha} nova />
      <div><button className="btn" disabled={fm.pendente}>Salvar senha</button></div>
    </form>
  );
}

export function FormReenviar() {
  const fm = useFormulario(acaoReenviar, () => ({}));
  return (
    <form ref={fm.ref} action={fm.despachar} className="pilha">
      <AvisoLink estado={fm.estado} />
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      {fm.estado.ok ? null : <div><button className="btn btn-claro btn-peq" disabled={fm.pendente}>Enviar link de confirmação</button></div>}
    </form>
  );
}

export function FormDenuncia({ vagaId }: { vagaId: string }) {
  const [v, setV] = useState('');
  const fm = useFormulario(acaoDenunciar, (f) => ({ motivo: pega(f, 'motivo').trim().length >= 5 ? null : 'Conte em poucas palavras o que há de errado.' }));
  if (fm.estado.ok) return <p className="aviso aviso-ok" role="status">Denúncia enviada. Vamos analisar esta vaga.</p>;
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha">
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <input type="hidden" name="vagaId" value={vagaId} />
      <Campo rotulo="O que há de errado?" erro={fm.erros.motivo} nome="motivo">
        <textarea name="motivo" maxLength={1000} value={v} onChange={(e) => setV(e.target.value)} {...aria('motivo', fm.erros.motivo)} />
      </Campo>
      <div><button className="btn btn-claro btn-peq" disabled={fm.pendente}>Enviar denúncia</button></div>
    </form>
  );
}

export { CampoEmail };

// Só no modo de demonstração: entra direto nas contas de teste.
export function EntrarTeste() {
  const fm = useFormulario(acaoEntrarSenha, () => ({}));
  return (
    <div className="painel-caixa teste-contas">
      <p><strong>Contas de teste</strong> <span className="nota">senha teste1234</span></p>
      <div className="linha-botoes">
        {[['empresa@teste.com', 'Entrar como empresa'], ['candidato@teste.com', 'Entrar como candidato']].map(([email, rotulo]) => (
          <form key={email} action={fm.despachar}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="senha" value="teste1234" />
            <button className="btn btn-claro">{rotulo}</button>
          </form>
        ))}
      </div>
      {fm.estado.erro ? <p className="erro">{fm.estado.erro}</p> : null}
    </div>
  );
}
