import Link from 'next/link';
import { acaoSair } from '@/app/acoes';
import { usuarioAtual, ehAdmin } from '@/lib/auth/sessao';
import { naoLidas } from '@/lib/candidaturas';
import { SIMULADOR } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { Ilha, type ItemNav } from './ilha';
import { LinkLegal } from './legal';
import { Palavra, Simbolo } from './marca';
import { TextoPrivacidade, TextoTermos } from './textos-legais';

const CREDITO_SVG = (
  <svg className="gr-ico" viewBox="22.5 22 84 84" aria-hidden="true" focusable="false">
    <clipPath id="gr-ct"><rect x="-60" y="-60" width="220" height="107" /></clipPath>
    <clipPath id="gr-cb"><rect x="-60" y="53" width="220" height="160" /></clipPath>
    <g transform="translate(25.3 24) scale(1.00125) translate(-16 -8.2)">
      <g fill="currentColor" transform="rotate(-22 50 50)">
        <g clipPath="url(#gr-ct)"><circle cx="60" cy="50" r="38" /></g>
        <g clipPath="url(#gr-cb)"><circle cx="50" cy="50" r="38" /></g>
      </g>
    </g>
  </svg>
);

export async function Topo() {
  const u = await usuarioAtual();
  const publico: ItemNav[] = [{ href: '/vagas', rotulo: 'Vagas' }, { href: '/calculos', rotulo: 'Cálculos' }];
  let itens: ItemNav[];
  let acao: ItemNav;
  let extra;
  if (!u) {
    itens = [...publico, { href: '/anunciantes', rotulo: 'Para empresas' }];
    acao = { href: '/criar-conta', rotulo: 'Criar conta' };
    extra = <Link className="btn btn-claro" href="/entrar">Entrar</Link>;
  } else {
    const db = await banco();
    const empresa = u.tipo === 'contratante';
    // As não lidas ficam em Conversas, que leva direto à caixa de entrada.
    itens = [{ href: empresa ? '/painel' : '/candidato', rotulo: empresa ? 'Meu painel' : 'Minha conta' }, { href: empresa ? '/painel/conversas' : '/candidato/conversas', rotulo: 'Conversas', contagem: await naoLidas(db, u.id, empresa ? 'empresa' : 'candidato') }, ...publico];
    if (ehAdmin(u.email)) itens = [{ href: '/admin', rotulo: 'Administração' }, ...itens];
    acao = empresa ? { href: '/publicar', rotulo: 'Publicar vaga' } : { href: '/vagas', rotulo: 'Ver vagas' };
    extra = <form action={acaoSair}><button type="submit" className="btn btn-claro" style={{ width: '100%' }}>Sair</button></form>;
  }
  return (
    <>
      {SIMULADOR ? <p className="faixa-demo">Demonstração</p> : null}
      <Ilha itens={itens} acao={acao} extra={extra} />
    </>
  );
}

export function Rodape() {
  return (
    <footer className="rodape">
      <Link href="/" className="rodape-marca" aria-label="GR Vagas, página inicial"><Simbolo tamanho={28} /><Palavra /></Link>
      <nav className="rodape-links" aria-label="Rodapé">
        <Link href="/vagas">Vagas abertas</Link>
        <Link href="/vagas/em/sao-jose-do-rio-preto">Vagas em Rio Preto</Link>
        <Link href="/anunciantes">Para empresas</Link>
        <Link href="/planos">Planos</Link>
        <Link href="/calculos/volta-do-almoco">Volta do almoço</Link>
        <Link href="/calculos/horas-extras">Horas extras</Link>
        <Link href="/entrar">Entrar</Link>
      </nav>
      <div className="rodape-base">
        <span>© {new Date().getFullYear()} GR Vagas.</span>
        <span className="rodape-legal">
          <LinkLegal rotulo="Termos de uso" titulo="Termos de uso"><TextoTermos /></LinkLegal>
          <LinkLegal rotulo="Política de privacidade" titulo="Política de privacidade"><TextoPrivacidade /></LinkLegal>
        </span>
        <a className="credito" href="https://grbrands.com.br" target="_blank" rel="noopener">Desenvolvido por {CREDITO_SVG}<b>GR Brands</b><i>.</i></a>
      </div>
    </footer>
  );
}
