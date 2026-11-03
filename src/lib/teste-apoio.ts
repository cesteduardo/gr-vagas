import { bancoEmMemoria, type Banco } from '@/lib/db/client';
import type { DadosVaga } from '@/lib/forms/vaga';
import { usuarios } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { publicarSemConta } from '@/lib/vagas';

export const umaVaga = (extra: Partial<DadosVaga> = {}): DadosVaga => ({
  titulo: 'Técnico de Enfermagem',
  area: 'Saúde',
  contrato: 'CLT',
  modalidade: 'Presencial',
  cidadeSlug: 'sao-jose-do-rio-preto',
  salarioCentavos: 250000,
  descricao: 'Atender pacientes na clínica, organizar a sala e registrar os atendimentos.',
  requisitos: 'Curso técnico e registro ativo',
  beneficios: 'Vale-transporte',
  ...extra,
});

let n = 0;
export async function umaEmpresa(db: Banco, extra: Partial<DadosVaga> = {}, confirmar = true) {
  n += 1;
  const email = `rh${n}@exemplo.com.br`;
  const r = await publicarSemConta(db, { nome: 'Ana Souza', email, telefone: '17999999999', empresa: `Empresa ${n}`, vaga: umaVaga(extra) });
  if (!r.ok) throw new Error('falhou');
  const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  if (confirmar) await db.update(usuarios).set({ emailConfirmadoEm: new Date() }).where(eq(usuarios.id, u!.id));
  const { empresas } = await import('@/lib/db/schema');
  const [e] = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.donoId, u!.id));
  return { usuarioId: u!.id, empresaId: e!.id, vagaId: r.vagaId, slug: r.slug, email };
}

export { bancoEmMemoria };
