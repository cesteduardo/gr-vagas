import { eq } from 'drizzle-orm';
import { cvDoTexto, cvValido, type Cv } from '@/lib/curriculo';
import type { Banco } from '@/lib/db/client';
import { perfis } from '@/lib/db/schema';
import { lerCurriculo, type DadosCurriculo } from '@/lib/ia/curriculo';
import { normalizar } from '@/lib/texto';

// Ao enviar o currículo, o perfil se atualiza sozinho: o que o arquivo traz e o perfil
// ainda não tem entra; o que a pessoa já escreveu nunca é apagado nem trocado.
// É isso que faz as vagas que combinam aparecerem logo depois do envio.

// Habilidades comuns que aparecem soltas no texto, mesmo sem uma seção "Habilidades".
// O teste roda no texto sem acento e em minúsculas.
const CONHECIDAS: [string, RegExp][] = [
  ['Pacote Office', /\b(pacote|ms|microsoft) office\b/],
  ['Excel', /\bexcel\b/],
  ['Word', /\b(ms )?word\b/],
  ['PowerPoint', /\bpower ?point\b/],
  ['Informática', /\binformatica\b/],
  ['Atendimento ao cliente', /\batendimento (ao |a )?(cliente|publico|consumidor)/],
  ['Vendas', /\bvendas?\b/],
  ['Operação de caixa', /\b(operador|operadora|operacao) de caixa\b|\bfrente de caixa\b/],
  ['Telemarketing', /\btelemarketing\b/],
  ['Recepção', /\brecepcao\b/],
  ['Controle de estoque', /\b(controle de )?estoque\b/],
  ['Logística', /\blogistica\b/],
  ['Empilhadeira', /\bempilhadeira\b/],
  ['Cozinha', /\bcozinha\b/],
  ['Limpeza', /\blimpeza\b/],
  ['Primeiros socorros', /\bprimeiros socorros\b/],
  ['Faturamento', /\bfaturamento\b/],
  ['Contas a pagar', /\bcontas a pagar\b/],
  ['Contas a receber', /\bcontas a receber\b/],
  ['Departamento pessoal', /\bdepartamento pessoal\b/],
  ['Folha de pagamento', /\bfolha de pagamento\b/],
  ['Redes sociais', /\bredes sociais\b|\bsocial media\b/],
  ['Photoshop', /\bphotoshop\b/],
  ['Illustrator', /\billustrator\b/],
  ['Canva', /\bcanva\b/],
  ['Figma', /\bfigma\b/],
  ['AutoCAD', /\bauto ?cad\b/],
  ['SAP', /\bsap\b/],
  ['Totvs', /\btotvs\b|\bprotheus\b/],
  ['Enfermagem', /\benfermagem\b/],
  ['Mecânica', /\bmecanica\b/],
  ['Elétrica', /\beletrica\b/],
  ['Solda', /\bsolda(gem|dor)?\b/],
  ['Manutenção', /\bmanutencao\b/],
];

const chave = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, ' ').trim();

export function habilidadesDoTexto(texto: string): string[] {
  const t = normalizar(texto);
  const achadas = CONHECIDAS.filter(([, r]) => r.test(t)).map(([nome]) => nome);
  for (const nr of new Set([...t.matchAll(/\bnr ?-? ?(\d{1,2})\b/g)].map((m) => Number(m[1])))) if (nr >= 1 && nr <= 38) achadas.push(`NR-${nr}`);
  const cnh = /\b(cnh|habilitacao|carteira de motorista)\b[^\n]{0,24}?\b(?:categoria|cat\.?)?\s*:?\s*\b(ab|ad|ae|a|b|c|d|e)\b(?![a-z])/.exec(t);
  if (cnh) achadas.push(`CNH ${cnh[2]!.toUpperCase()}`);
  return achadas;
}

export type PerfilBase = { titulo: string; cidadeSlug: string; resumo: string; cv: Cv };
/** Só o que entrou agora: o editor aberto soma isso ao que já está na tela. */
export type Acrescimos = { titulo?: string; cidadeSlug?: string; resumo?: string; cv: Cv };

const MAX_HABILIDADES = 20;

export function perfilComCurriculo(atual: PerfilBase, lido: Cv, dados: DadosCurriculo, texto: string): { perfil: PerfilBase; acrescimos: Acrescimos } {
  const cv: Cv = { idiomas: [], formacao: [], experiencias: [], habilidades: [], ...atual.cv };
  const novo: Cv = {};

  const juntar = <T>(k: 'idiomas' | 'formacao' | 'experiencias', itens: T[] | undefined, id: (x: T) => string) => {
    const tem = new Set(((cv[k] ?? []) as T[]).map(id));
    const entram = (itens ?? []).filter((x) => {
      const c = id(x);
      if (!c || tem.has(c)) return false;
      tem.add(c);
      return true;
    }).slice(0, Math.max(0, 20 - (cv[k]?.length ?? 0)));
    if (entram.length) {
      (cv as Record<string, unknown>)[k] = [...(cv[k] ?? []), ...entram];
      (novo as Record<string, unknown>)[k] = entram;
    }
  };
  juntar('experiencias', lido.experiencias, (e) => `${chave(e.cargo)}|${chave(e.empresa)}`);
  juntar('formacao', lido.formacao, (f) => chave(f.curso));
  juntar('idiomas', lido.idiomas, (i) => chave(i.lingua));

  // Habilidades curtas: linha comprida da seção vira frase, não etiqueta.
  const tem = new Set((cv.habilidades ?? []).map(chave));
  const habilidades: string[] = [];
  for (const h of [...(lido.habilidades ?? []), ...habilidadesDoTexto(texto)]) {
    const limpa = h.replace(/\s+/g, ' ').replace(/[.:;]+$/, '').trim();
    const c = chave(limpa);
    if (!c || limpa.length > 40 || tem.has(c)) continue;
    if ((cv.habilidades?.length ?? 0) + habilidades.length >= MAX_HABILIDADES) break;
    tem.add(c);
    habilidades.push(limpa);
  }
  if (habilidades.length) {
    cv.habilidades = [...(cv.habilidades ?? []), ...habilidades];
    novo.habilidades = habilidades;
  }

  for (const k of ['objetivo', 'estadoCivil', 'nascimento', 'endereco', 'portfolio'] as const) {
    if (!cv[k] && lido[k]) cv[k] = novo[k] = lido[k];
  }

  const acrescimos: Acrescimos = { cv: novo };
  const perfil: PerfilBase = { ...atual, cv: cvValido(cv) };
  const titulo = (dados.titulo || lido.objetivo || lido.experiencias?.find((e) => e.atual)?.cargo || lido.experiencias?.[0]?.cargo || '').trim().slice(0, 80);
  if (!atual.titulo.trim() && titulo.length >= 3) perfil.titulo = acrescimos.titulo = titulo;
  if (!atual.cidadeSlug && dados.cidadeSlug) perfil.cidadeSlug = acrescimos.cidadeSlug = dados.cidadeSlug;
  if (!atual.resumo.trim() && dados.resumo.trim()) perfil.resumo = acrescimos.resumo = dados.resumo.trim();
  return { perfil, acrescimos };
}

/** Lê o PDF já guardado e grava no perfil o que ele acrescenta. */
export async function aplicarCurriculo(db: Banco, usuarioId: string, b: Buffer): Promise<{ perfil: PerfilBase; acrescimos: Acrescimos }> {
  const { dados, texto } = await lerCurriculo(b);
  const [p] = await db.select({ titulo: perfis.titulo, cidadeSlug: perfis.cidadeSlug, resumo: perfis.resumo, cv: perfis.cv }).from(perfis).where(eq(perfis.usuarioId, usuarioId));
  const atual: PerfilBase = p ?? { titulo: '', cidadeSlug: '', resumo: '', cv: {} };
  const r = perfilComCurriculo(atual, cvDoTexto(texto), dados, texto);
  const valores = { titulo: r.perfil.titulo, cidadeSlug: r.perfil.cidadeSlug, resumo: r.perfil.resumo, cv: r.perfil.cv, atualizadoEm: new Date() };
  await db.insert(perfis).values({ usuarioId, ...valores }).onConflictDoUpdate({ target: perfis.usuarioId, set: valores });
  return r;
}
