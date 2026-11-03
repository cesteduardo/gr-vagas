import { normalizar } from '@/lib/texto';

// Etiquetas da vaga. As características a empresa marca ao publicar (e o texto colado
// já marca o que estiver escrito). Os benefícios saem do que ela escreveu em "Benefícios":
// nada aparece na vaga sem estar escrito por quem anunciou.

export const TAGS_VAGA = [
  { id: 'sem-experiencia', nome: 'Sem experiência', achar: /\bsem experiencia\b|\bnao (e )?(exige|exigimos|precisa|pedimos|necessaria|necessario|obrigatoria)\b.{0,12}\bexperiencia\b|\bexperiencia (nao (e )?(necessaria|obrigatoria|exigida)|dispensavel)\b/ },
  { id: 'primeiro-emprego', nome: 'Primeiro emprego', achar: /\bprimeiro emprego\b/ },
  { id: 'inicio-imediato', nome: 'Início imediato', achar: /\binicio imediato\b|\bcontratacao imediata\b|\bcomeca(r)? (ja|imediatamente)\b/ },
  { id: 'meio-periodo', nome: 'Meio período', achar: /\bmeio (periodo|expediente)\b|\bpart[ -]?time\b/ },
  { id: 'escala-12x36', nome: 'Escala 12x36', achar: /\b12 ?x ?36\b/ },
  { id: 'turno-noite', nome: 'Turno da noite', achar: /\bnoturn[oa]\b|\bturno da noite\b/ },
  { id: 'fins-de-semana-livres', nome: 'Fins de semana livres', achar: /\bde segunda a sexta\b|\bfins? de semana (livres?|de folga)\b|\bfolga (aos|nos) fins? de semana\b/ },
  { id: 'pcd', nome: 'Também para PcD', achar: /\bpcd\b|\bpessoas? com deficiencia\b/ },
  { id: 'mais-50', nome: 'Aceita 50+', achar: /\b50 ?\+|\bacima de 50\b|\bmais de 50 anos\b|\b50 anos ou mais\b/ },
] as const;

export type TagId = (typeof TAGS_VAGA)[number]['id'];
export const MAX_TAGS = 6;

const ids = new Set<string>(TAGS_VAGA.map((t) => t.id));

export function tagsValidas(lista: unknown): TagId[] {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  for (const t of lista) if (typeof t === 'string' && ids.has(t)) vistas.add(t);
  return [...vistas].slice(0, MAX_TAGS) as TagId[];
}

export const nomeDaTag = (id: string) => TAGS_VAGA.find((t) => t.id === id)?.nome ?? null;

export function tagsDoTexto(texto: string): TagId[] {
  const t = normalizar(texto);
  return TAGS_VAGA.filter((g) => g.achar.test(t)).map((g) => g.id).slice(0, MAX_TAGS);
}

const BENEFICIOS = [
  { nome: 'Vale-transporte', achar: /\bvale[ -]?transporte\b|\bvt\b/ },
  { nome: 'Vale-refeição', achar: /\bvale[ -]?refeicao\b|\bvr\b|\bticket refeicao\b/ },
  { nome: 'Vale-alimentação', achar: /\bvale[ -]?alimentacao\b|\bva\b|\bcartao alimentacao\b/ },
  { nome: 'Cesta básica', achar: /\bcesta basica\b/ },
  { nome: 'Refeição no local', achar: /\b(refeicao|almoco|alimentacao) no local\b|\brefeitorio\b/ },
  { nome: 'Plano de saúde', achar: /\bplano de saude\b|\bconvenio medico\b|\bassistencia medica\b/ },
  { nome: 'Plano odontológico', achar: /\bodontologic[oa]\b/ },
  { nome: 'Seguro de vida', achar: /\bseguro de vida\b/ },
  { nome: 'Comissão', achar: /\bcomiss(ao|oes)\b/ },
  { nome: 'Bônus', achar: /\bbonus\b|\bbonificac(ao|oes)\b|\bpremiac(ao|oes)\b/ },
  { nome: 'Participação nos lucros', achar: /\bplr\b|\bparticipacao nos lucros\b/ },
  { nome: 'Academia', achar: /\bgympass\b|\bwellhub\b|\btotalpass\b|\bacademia\b/ },
  { nome: 'Folga no aniversário', achar: /\bday ?off\b|\bfolga no aniversario\b/ },
  { nome: 'Auxílio-creche', achar: /\bauxilio[ -]?creche\b/ },
] as const;

export function beneficiosDoTexto(texto: string): string[] {
  const t = normalizar(texto);
  return BENEFICIOS.filter((b) => b.achar.test(t)).map((b) => b.nome);
}

export function etiquetasDaVaga(v: { tags: readonly string[] | null | undefined; beneficios: string }) {
  return {
    tags: tagsValidas(v.tags ?? []).map((t) => nomeDaTag(t)!),
    beneficios: beneficiosDoTexto(v.beneficios),
  };
}
