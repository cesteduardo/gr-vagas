import { BASE } from '@/lib/base';
import Link from 'next/link';

const inicial = (n: string) => n.trim().charAt(0).toUpperCase() || '?';

// Bolinha com o logo (ou a inicial) e o nome da empresa, levando ao perfil dela.
export function EmpresaSelo({ id, nome, slug, temLogo }: { id: string; nome: string; slug: string; temLogo: boolean }) {
  return (
    <Link href={`/empresas/${slug}`} className="empresa-selo">
      <span className="empresa-selo-foto" aria-hidden="true">
        {temLogo ? <img src={`${BASE}/api/logo/${id}`} alt="" width={34} height={34} decoding="async" /> : inicial(nome)}
      </span>
      <span>{nome}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  );
}
