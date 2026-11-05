import Link from 'next/link';
import { formatarSalario } from '@/lib/texto';
import type { VagaPublica } from '@/lib/vagas';

// Na página da própria empresa, o nome dela em cada linha só repete o que está no topo.
export function ListaVagas({ vagas, semEmpresa }: { vagas: VagaPublica[]; semEmpresa?: boolean }) {
  return (
    <ul className="lista-vagas">
      {vagas.map((v) => (
        <li key={v.id}>
          <Link href={`/vagas/${v.slug}`} className="vaga-linha">
            <h3>{v.titulo}{v.destaque ? <span className="etiqueta">Destaque</span> : null}</h3>
            <span className="vaga-linha-meta">{semEmpresa ? '' : `${v.empresaNome}, `}{v.cidade}. {v.contrato}, {v.modalidade.toLowerCase()}.</span>
            <span className="vaga-linha-salario">{formatarSalario(v.salarioCentavos)}</span>
            <span className="vaga-seta" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
