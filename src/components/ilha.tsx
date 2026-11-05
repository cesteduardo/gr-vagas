'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Palavra, Simbolo } from './marca';

export type ItemNav = { href: string; rotulo: string; contagem?: number };
export type Conta = { nome: string; imagem: string | null; links: ItemNav[]; sair: ReactNode };

function Contagem({ n }: { n?: number }) {
  return n ? <span className="selo-contagem">{n}<span className="so-leitor"> não lidas</span></span> : null;
}

const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] ?? n;

function Bolinha({ conta }: { conta: Conta }) {
  return <span className="conta-foto" aria-hidden="true">{conta.imagem ? <img src={conta.imagem} alt="" width={34} height={34} /> : conta.nome.trim().charAt(0).toUpperCase()}</span>;
}

// Menu da conta: a bolinha com foto (ou logo) e o primeiro nome; perfil, plano e sair ficam aqui dentro.
function MenuConta({ conta, atual }: { conta: Conta; atual: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  useEffect(() => setAberto(false), [atual]);
  return (
    <div className="conta" ref={caixa}>
      <button type="button" className="conta-botao" aria-expanded={aberto} aria-haspopup="true" aria-label={`Sua conta, ${conta.nome}`} onClick={() => setAberto((a) => !a)}>
        <Bolinha conta={conta} />
        <span className="conta-nome">{primeiroNome(conta.nome)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
      </button>
      {aberto ? (
        <div className="conta-menu">
          <p className="conta-quem"><strong>{conta.nome}</strong></p>
          {conta.links.map((l) => <Link key={l.href} href={l.href} aria-current={atual === l.href ? 'page' : undefined}>{l.rotulo}</Link>)}
          <div className="conta-sair">{conta.sair}</div>
        </div>
      ) : null}
    </div>
  );
}

// Mesmo comportamento da Zelo e da Automatize: barra solta no topo, pílula de vidro ao rolar.
export function Ilha({ itens, acao, extra, conta }: { itens: ItemNav[]; acao?: ItemNav; extra?: ReactNode; conta?: Conta }) {
  const [solida, setSolida] = useState(false);
  const [aberto, setAberto] = useState(false);
  const atual = usePathname();

  useEffect(() => {
    const aoRolar = () => setSolida(window.scrollY > 60);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  // Fica marcado o item mais específico: em /painel/conversas, "Conversas", não "Minhas vagas".
  const marcado = itens.map((i) => i.href).filter((h) => atual === h || atual.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
  const ativo = (href: string) => href === marcado;

  return (
    <div className={`${solida ? 'solida ' : ''}${aberto ? 'menu-aberto' : ''}`}>
      <header className="topbar">
        <div className="ilha">
          <Link href="/" className="marca" aria-label="GR Vagas, página inicial"><Simbolo /><Palavra /></Link>
          <nav className="nav-links" aria-label="Principal">
            {itens.map((i) => (
              <Link key={i.href} href={i.href} aria-current={ativo(i.href) ? 'page' : undefined}>{i.rotulo}<Contagem n={i.contagem} /></Link>
            ))}
          </nav>
          <div className="acoes-topo">
            {extra}
            {acao ? <Link className="btn" href={acao.href}>{acao.rotulo}</Link> : null}
            {conta ? <MenuConta conta={conta} atual={atual} /> : null}
          </div>
          <button type="button" className="menu-btn" aria-expanded={aberto} aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setAberto((a) => !a)}><span /></button>
        </div>
      </header>
      <div className="veu" aria-hidden="true" onClick={() => setAberto(false)} />
      <nav className="gaveta" aria-label="Menu" inert={!aberto}>
        {itens.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setAberto(false)}>{i.rotulo}<Contagem n={i.contagem} /></Link>
        ))}
        {conta ? (
          <div className="gaveta-conta">
            <p className="gaveta-quem"><Bolinha conta={conta} /><strong>{conta.nome}</strong></p>
            {conta.links.map((l) => <Link key={l.href} href={l.href} onClick={() => setAberto(false)}>{l.rotulo}</Link>)}
          </div>
        ) : null}
        {acao ? <Link className="btn" href={acao.href} onClick={() => setAberto(false)}>{acao.rotulo}</Link> : null}
        {extra}
        {conta ? conta.sair : null}
      </nav>
    </div>
  );
}
