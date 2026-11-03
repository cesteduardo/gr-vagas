import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { EditorEmpresa } from '@/components/editor-empresa';
import { exigirContratante } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';

export const metadata: Metadata = { title: 'Empresa' };

export default async function Empresa() {
  const u = await exigirContratante();
  const [e] = await (await banco()).select({ id: empresas.id, nome: empresas.nome, descricao: empresas.descricao, slug: empresas.slug, perfil: empresas.perfil, temLogo: sql<boolean>`${empresas.logo} is not null`, temCapa: sql<boolean>`${empresas.capa} is not null` }).from(empresas).where(eq(empresas.id, u.empresaId));
  return (
    <div className="pilha" style={{ maxWidth: 860 }}>
      <div>
        <h1 className="titulo-painel">Sua empresa</h1>
        <p className="leve" style={{ marginTop: 6 }}>Quanto mais completo, mais o candidato confia e se candidata.</p>
      </div>
      <EditorEmpresa inicial={{ ...e!, perfil: e!.perfil ?? {} }} />
    </div>
  );
}
