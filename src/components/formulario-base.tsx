'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import { formatarTelefone, normalizarTelefone, sanitizarNome } from '@/lib/forms/validators';

export type EstadoForm = { erro?: string; erros?: Record<string, string>; ok?: boolean; aviso?: string; link?: string };
const INICIAL: EstadoForm = {};
type Validador = (dados: FormData) => Record<string, string | null | undefined>;

export const pega = (f: FormData, n: string) => String(f.get(n) ?? '');

// Valida no navegador, marca o campo e leva o foco ao primeiro erro. O servidor valida de novo.
export function useFormulario(acao: (s: EstadoForm, f: FormData) => Promise<EstadoForm>, validar: Validador, limparAoSalvar = false) {
  const [estado, despachar, pendente] = useActionState(acao, INICIAL);
  const [locais, setLocais] = useState<Record<string, string>>({});
  const ref = useRef<HTMLFormElement>(null);
  const erros: Record<string, string | undefined> = { ...estado.erros, ...locais };

  const focarErro = () => {
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  };

  useEffect(() => {
    setLocais({});
    if (estado.erros && Object.keys(estado.erros).length) focarErro();
    if (estado.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  // Envia à mão: pela ação direta, o React limpa o formulário e a pessoa perde o que digitou
  // quando há erro (errar a senha apagava o e-mail).
  const aoEnviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const achados = Object.fromEntries(Object.entries(validar(new FormData(e.currentTarget))).filter(([, v]) => v)) as Record<string, string>;
    setLocais(achados);
    if (Object.keys(achados).length) {
      focarErro();
      return;
    }
    const dados = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => despachar(dados));
  };
  return { estado, despachar, pendente, erros, ref, aoEnviar };
}

export const aria = (nome: string, erro?: string) => ({ 'aria-invalid': erro ? (true as const) : undefined, 'aria-describedby': erro ? `erro-${nome}` : undefined });

export function Campo({ rotulo, erro, nome, children }: { rotulo: string; erro?: string; nome: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {erro ? <span className="erro" id={`erro-${nome}`}>{erro}</span> : null}
    </label>
  );
}

export function CampoNome({ erro, rotulo = 'Seu nome', inicial = '' }: { erro?: string; rotulo?: string; inicial?: string }) {
  const [v, setV] = useState(inicial);
  return (
    <Campo rotulo={rotulo} erro={erro} nome="nome">
      <input type="text" name="nome" autoComplete="name" value={v} onChange={(e) => setV(sanitizarNome(e.target.value))} {...aria('nome', erro)} />
    </Campo>
  );
}

export function CampoTelefone({ erro, inicial = '' }: { erro?: string; inicial?: string }) {
  const [v, setV] = useState(formatarTelefone(inicial));
  const aoColar = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setV(formatarTelefone(normalizarTelefone(e.clipboardData.getData('text'))));
  };
  return (
    <Campo rotulo="WhatsApp com DDD" erro={erro} nome="telefone">
      <input type="tel" name="telefone" inputMode="numeric" autoComplete="tel-national" placeholder="(17) 99999-9999" value={v} onPaste={aoColar} onChange={(e) => setV(formatarTelefone(normalizarTelefone(e.target.value)))} {...aria('telefone', erro)} />
    </Campo>
  );
}

export function CampoEmail({ erro, inicial }: { erro?: string; inicial?: string }) {
  return (
    <Campo rotulo="E-mail" erro={erro} nome="email">
      <input type="email" name="email" inputMode="email" autoComplete="email" defaultValue={inicial} {...aria('email', erro)} />
    </Campo>
  );
}

export function AvisoLink({ estado }: { estado: EstadoForm }) {
  if (!estado.aviso && !estado.link) return null;
  return (
    <p className="aviso aviso-ok" role="status">
      {estado.aviso}
      {estado.link ? <> Modo de demonstração, sem e-mail de verdade: <a href={estado.link}>abrir o link de acesso</a>.</> : null}
    </p>
  );
}
