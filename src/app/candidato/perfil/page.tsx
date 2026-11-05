import type { Metadata } from 'next';
import { EditorCurriculo } from '@/components/editor-curriculo';
import { FotoCandidato } from '@/components/perfil-imagens';
import { exigirCandidato } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { perfilDe } from '@/lib/perfis';

export const metadata: Metadata = { title: 'Seu perfil' };

export default async function Perfil() {
  const u = await exigirCandidato();
  const p = await perfilDe(await banco(), u.id);
  return (
    <div className="pilha" style={{ maxWidth: 860 }}>
      <div>
        <h1 className="titulo-painel">Seu perfil</h1>
        <p className="leve" style={{ marginTop: 6 }}>Preencha como no seu currículo. As empresas às quais você se candidatar veem tudo isto; as outras empresas com conta veem só a parte profissional, se você deixar.</p>
      </div>
      <FotoCandidato id={u.id} nome={u.nome} temFoto={Boolean(p.temFoto)} />
      <EditorCurriculo inicial={{ titulo: p.titulo, cidadeSlug: p.cidadeSlug, resumo: p.resumo, talentos: Boolean(p.aceiteTalentosEm), visivel: p.visivelEmpresas, cv: p.cv ?? {}, curriculoNome: p.curriculoNome, candidatoId: u.id }} />
    </div>
  );
}
