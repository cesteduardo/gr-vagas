import Link from 'next/link';
import type { ItemConversa } from '@/lib/candidaturas';
import { ETAPAS } from '@/lib/config';

const FUSO = 'America/Sao_Paulo';
const dia = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO });

// Hoje mostra a hora; antes disso, a data.
function quando(d: Date) {
  return dia(d) === dia(new Date()) ? d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
}

export function CaixaConversas({ itens, vazio }: { itens: ItemConversa[]; vazio: React.ReactNode }) {
  if (!itens.length) return <div className="vazio">{vazio}</div>;
  return (
    <ul className="caixa-conversas">
      {itens.map((c) => (
        <li key={c.id}>
          <Link href={`/conversas/${c.id}`} className={`conversa-linha${c.naoLidas ? ' nao-lida' : ''}`}>
            <span className="conversa-foto" aria-hidden="true">{c.imagem ? <img src={c.imagem} alt="" width={48} height={48} loading="lazy" decoding="async" /> : c.nome.trim().charAt(0).toUpperCase()}</span>
            <span className="conversa-corpo">
              <span className="conversa-topo">
                <strong>{c.nome}</strong>
                <time dateTime={c.ultimaEm.toISOString()}>{quando(c.ultimaEm)}</time>
              </span>
              <span className="conversa-vaga">{c.vagaTitulo} · {ETAPAS.find((e) => e.id === c.etapa)?.rotulo ?? c.etapa}</span>
              <span className="conversa-ultima">
                <span>{c.ultimaTexto ? `${c.minha ? 'Você: ' : ''}${c.ultimaTexto}` : 'Candidatura enviada. Nenhuma mensagem ainda.'}</span>
                {c.naoLidas ? <span className="selo-contagem">{c.naoLidas}<span className="so-leitor"> {c.naoLidas === 1 ? 'mensagem não lida' : 'mensagens não lidas'}</span></span> : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
