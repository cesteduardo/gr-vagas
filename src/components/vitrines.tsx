import Link from 'next/link';
import { Carrossel } from './carrossel';
import { formatarSalario } from '@/lib/texto';
import type { VagaPublica } from '@/lib/vagas';

type Empresa = { id: string; nome: string; slug: string; temLogo: boolean; vagas: number };

const inicial = (n: string) => n.trim().charAt(0).toUpperCase();

function CartaoVaga({ v, i, copia }: { v: VagaPublica; i: number; copia?: boolean }) {
  return (
    <Link href={`/vagas/${v.slug}`} className={`vaga-cartao tom-${i % 4}`} tabIndex={copia ? -1 : undefined} aria-hidden={copia ? true : undefined}>
      <span className="vaga-cartao-topo">
        {v.temLogo ? <img src={`/api/logo/${v.empresaId}`} alt="" width={44} height={44} loading="lazy" decoding="async" /> : <span className="inicial">{inicial(v.empresaNome)}</span>}
        <span className="vaga-cartao-empresa">{v.empresaNome}</span>
      </span>
      <strong>{v.titulo}</strong>
      <span className="vaga-cartao-pe">
        <span>{v.cidade}<br />{v.contrato}, {v.modalidade.toLowerCase()}</span>
        <b>{formatarSalario(v.salarioCentavos)}</b>
      </span>
    </Link>
  );
}

// As vagas passam sozinhas, devagar, e as setas levam para frente e para trás.
export function CarrosselVagas({ vagas }: { vagas: VagaPublica[] }) {
  return (
    <Carrossel rotulo="Vagas abertas">
      {vagas.map((v, i) => <CartaoVaga key={v.id} v={v} i={i} />)}
    </Carrossel>
  );
}

function Azulejo({ e, i, copia }: { e: Empresa; i: number; copia?: boolean }) {
  return (
    <Link href={`/empresas/${e.slug}`} className="azulejo" tabIndex={copia ? -1 : undefined} aria-hidden={copia ? true : undefined}>
      {e.temLogo ? <img src={`/api/logo/${e.id}`} alt="" width={40} height={40} loading="lazy" decoding="async" /> : <span className={`inicial tom-${i % 4}`}>{inicial(e.nome)}</span>}
      <span>{e.nome}<small>{e.vagas === 1 ? '1 vaga aberta' : `${e.vagas} vagas abertas`}</small></span>
    </Link>
  );
}

// Letreiro lento: dá tempo de ler e de clicar na empresa que interessa.
export function LetreiroEmpresas({ empresas }: { empresas: Empresa[] }) {
  if (!empresas.length) return null;
  const metade = Math.ceil(empresas.length / 2);
  const fileiras = empresas.length >= 8 ? [empresas.slice(0, metade), empresas.slice(metade)] : [empresas];
  return (
    <div className="letreiro" aria-label="Empresas contratando">
      {fileiras.map((lista, f) => {
        // Repete até encher a tela, para o movimento emendar sem buraco.
        const cheia = Array.from({ length: Math.ceil(10 / lista.length) }, () => lista).flat();
        return (
          <div key={f} className={`letreiro-trilho${f ? ' letreiro-volta' : ''}`} style={{ animationDuration: `${cheia.length * 7}s` }}>
            {cheia.map((e, i) => <Azulejo key={`${e.id}-${i}`} e={e} i={i} copia={i >= lista.length} />)}
            {cheia.map((e, i) => <Azulejo key={`c-${e.id}-${i}`} e={e} i={i} copia />)}
          </div>
        );
      })}
    </div>
  );
}
