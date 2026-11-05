import type { Cv } from '@/lib/curriculo';
import { normalizar } from '@/lib/texto';

// Cruzamento de perfil e vaga. Uma vaga só "combina" quando o que a pessoa faz
// (cargo, objetivo, cargos que já teve) aparece no cargo, na área ou nas tags da
// vaga. Palavra de nível ("auxiliar", "assistente") ou de lugar nunca basta sozinha.

const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'e', 'a', 'o', 'as', 'os', 'com', 'para', 'por', 'um', 'uma', 'na', 'no', 'nas', 'nos', 'ao', 'aos', 'como', 'mais', 'muito', 'sobre', 'entre', 'vaga', 'vagas', 'anos', 'ano', 'meses', 'experiencia', 'trabalho', 'trabalhei', 'empresa', 'empresas', 'area', 'sao', 'jose', 'rio', 'preto', 'regiao', 'cidade', 'atual', 'desde', 'ate', 'bom', 'boa', 'ter', 'ser', 'tenho', 'sou', 'moro', 'disponibilidade', 'horario', 'horarios', 'periodo', 'integral', 'clt', 'pj', 'salario', 'beneficios', 'cinco', 'dois', 'tres', 'quatro', 'seis']);

// Nível ou função genérica: conta pouco e nunca faz uma vaga combinar sozinha.
const GENERICAS = new Set(['auxil', 'assis', 'ajud', 'anal', 'anali', 'tecn', 'oper', 'estag', 'apren', 'jovem', 'geren', 'coord', 'super', 'encar', 'lider', 'junio', 'senio', 'plen', 'geral', 'servi', 'colab', 'profi', 'respo', 'diar', 'publ', 'clien', 'equip', 'atual', 'funca', 'cargo']);

// Sufixos do português, do mais longo ao mais curto. Corta o sufixo e fica com
// até cinco letras: "cozinheiro" e "cozinha" viram "cozin"; "atendente" e
// "atendimento" viram "atend"; "recepcionista" e "recepção" viram "recep".
const SUFIXOS = ['amentos', 'imentos', 'amento', 'imento', 'mente', 'istas', 'ista', 'eiros', 'eiras', 'eiro', 'eira', 'adores', 'adoras', 'ador', 'adora', 'edores', 'edor', 'edora', 'entes', 'ente', 'antes', 'ante', 'coes', 'cao', 'sao', 'agem', 'arias', 'aria', 'arios', 'ario', 'idade', 'ica', 'ico', 'ia', 'es', 'os', 'as', 's', 'a', 'o', 'e'];

export function radical(palavra: string): string {
  let p = palavra;
  for (const s of SUFIXOS) {
    if (p.length - s.length >= 4 && p.endsWith(s)) { p = p.slice(0, -s.length); break; }
  }
  return p.slice(0, 5);
}

type Termo = { raiz: string; palavra: string };
export function termos(t: string): Termo[] {
  const vistos = new Set<string>();
  const saida: Termo[] = [];
  for (const palavra of normalizar(t).split(/[^a-z0-9]+/)) {
    if (palavra.length < 3 || VAZIAS.has(palavra) || /^\d+$/.test(palavra)) continue;
    const raiz = radical(palavra);
    if (vistos.has(raiz)) continue;
    vistos.add(raiz);
    saida.push({ raiz, palavra });
  }
  return saida;
}

export type PerfilCruzamento = { titulo: string; resumo: string; cidadeSlug?: string; cv?: Cv };
export type VagaCruzamento = { titulo: string; area: string; requisitos?: string; descricao?: string; tags?: string[]; cidadeSlug?: string };

const raizes = (t: string) => new Set(termos(t).map((x) => x.raiz));

// O que a pessoa faz pesa mais que o que ela sabe; o texto livre pesa menos.
function sinaisDoPerfil(p: PerfilCruzamento) {
  const cv = p.cv ?? {};
  const funcao = raizes([p.titulo, cv.objetivo ?? '', ...(cv.experiencias ?? []).map((e) => e.cargo)].join(' '));
  const sabe = raizes([...(cv.habilidades ?? []), ...(cv.formacao ?? []).map((f) => f.curso), ...(cv.experiencias ?? []).map((e) => e.descricao)].join(' '));
  const resto = raizes(p.resumo);
  return { funcao, sabe, resto, vazio: !funcao.size && !sabe.size && !resto.size };
}

export type Cruzamento = { pontos: number; porcentagem: number; emComum: string[]; combina: boolean };

export function cruzar(p: PerfilCruzamento, v: VagaCruzamento, sinais = sinaisDoPerfil(p)): Cruzamento | null {
  if (sinais.vazio) return null;
  const doCargo = termos(v.titulo);
  const doCargoR = new Set(doCargo.map((t) => t.raiz));
  const daArea = termos(`${v.area} ${(v.tags ?? []).join(' ')}`).filter((t) => !doCargoR.has(t.raiz));
  const jaVistas = new Set([...doCargoR, ...daArea.map((t) => t.raiz)]);
  const doPedido = termos(`${v.requisitos ?? ''} ${v.descricao ?? ''}`).filter((t) => !jaVistas.has(t.raiz) && !GENERICAS.has(t.raiz)).slice(0, 40);

  const emComum: string[] = [];
  let pontos = 0;
  let forte = false;
  let pesoCargo = 0;
  let achouCargo = 0;
  let soNoResumo = 0;
  for (const t of doCargo) {
    const generica = GENERICAS.has(t.raiz);
    const peso = generica ? 1 : 3;
    pesoCargo += peso;
    const ganho = sinais.funcao.has(t.raiz) ? 1 : sinais.sabe.has(t.raiz) ? 0.6 : sinais.resto.has(t.raiz) ? 0.4 : 0;
    if (!ganho) continue;
    achouCargo += peso * ganho;
    pontos += (generica ? 4 : 24) * ganho;
    if (!generica && ganho >= 0.6) forte = true;
    if (!generica && ganho < 0.6) soNoResumo += 1;
    emComum.push(t.palavra);
  }
  let achouArea = 0;
  for (const t of daArea) {
    if (GENERICAS.has(t.raiz)) continue;
    const ganho = sinais.funcao.has(t.raiz) ? 1 : sinais.sabe.has(t.raiz) ? 0.7 : sinais.resto.has(t.raiz) ? 0.4 : 0;
    if (!ganho) continue;
    achouArea += ganho;
    pontos += 8 * ganho;
    if (sinais.funcao.has(t.raiz)) forte = true;
    emComum.push(t.palavra);
  }
  let achouPedido = 0;
  for (const t of doPedido) {
    const ganho = sinais.sabe.has(t.raiz) ? 1 : sinais.funcao.has(t.raiz) ? 0.8 : sinais.resto.has(t.raiz) ? 0.5 : 0;
    if (!ganho) continue;
    achouPedido += ganho;
    pontos += 3 * ganho;
    emComum.push(t.palavra);
  }
  // Sem nada do cargo ou da área, só vale se o que a vaga pede bate bastante com o que a pessoa sabe.
  // Duas palavras do cargo no resumo também valem: "atendimento em loja" para "Atendente de loja".
  const combina = forte || soNoResumo >= 2 || achouPedido >= 3;
  if (combina && p.cidadeSlug && v.cidadeSlug === p.cidadeSlug) pontos += 3;

  const parteCargo = pesoCargo ? achouCargo / pesoCargo : 0;
  const parteArea = daArea.length ? Math.min(1, achouArea / Math.min(daArea.length, 2)) : parteCargo;
  const partePedido = doPedido.length ? Math.min(1, achouPedido / Math.min(doPedido.length, 5)) : parteCargo;
  const porcentagem = Math.round((parteCargo * 0.65 + Math.max(parteArea, partePedido) * 0.35) * 100);
  return { pontos, porcentagem: combina ? porcentagem : Math.min(porcentagem, 25), emComum: [...new Set(emComum)].slice(0, 6), combina };
}

// Ordena só o que combina; o resto fica de fora em vez de virar "sugestão".
export function ordenarPorCombinacao<V extends VagaCruzamento>(p: PerfilCruzamento, lista: V[], quantas: number): (V & { emComum: string[] })[] {
  const sinais = sinaisDoPerfil(p);
  if (sinais.vazio) return [];
  return lista
    .map((v) => ({ v, c: cruzar(p, v, sinais) }))
    .filter((x): x is { v: V; c: Cruzamento } => Boolean(x.c?.combina))
    .sort((a, b) => b.c.pontos - a.c.pontos)
    .slice(0, quantas)
    .map(({ v, c }) => ({ ...v, emComum: c.emComum }));
}
