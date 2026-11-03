import { normalizarTelefone, telefoneValido } from '@/lib/forms/validators';

// O perfil segue a estrutura de um currículo brasileiro comum: dados pessoais,
// idiomas, formação e experiência, cada item com período e descrição.
export type Idioma = { lingua: string; nivel: string };
export type Formacao = { inicio: string; fim: string; curso: string; instituicao: string; descricao: string };
export type Experiencia = { inicio: string; fim: string; atual: boolean; cargo: string; empresa: string; descricao: string };
export type Cv = { objetivo?: string; estadoCivil?: string; nascimento?: string; endereco?: string; portfolio?: string; idiomas?: Idioma[]; formacao?: Formacao[]; experiencias?: Experiencia[]; habilidades?: string[] };

export const NIVEIS = ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'] as const;
export const ESTADOS_CIVIS = ['', 'Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'] as const;

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const bloco = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
const ano = (v: unknown) => (typeof v === 'string' && /^\d{4}$/.test(v.trim()) ? v.trim() : '');
const lista = <T>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | null): T[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object').map(f).filter((x): x is T => x !== null).slice(0, max) : [];

// Nada do navegador é confiável: só passa o que tem forma de currículo.
export function cvValido(c: unknown): Cv {
  const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
  const nascimento = typeof o.nascimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.nascimento) ? o.nascimento : '';
  return {
    objetivo: txt(o.objetivo, 160),
    estadoCivil: (ESTADOS_CIVIS as readonly string[]).includes(String(o.estadoCivil ?? '')) ? String(o.estadoCivil ?? '') : '',
    nascimento,
    endereco: txt(o.endereco, 160),
    portfolio: txt(o.portfolio, 160).replace(/^javascript:/i, ''),
    idiomas: lista(o.idiomas, 10, (x) => {
      const lingua = txt(x.lingua, 40);
      const nivel = (NIVEIS as readonly string[]).includes(String(x.nivel)) ? String(x.nivel) : 'Básico';
      return lingua ? { lingua, nivel } : null;
    }),
    formacao: lista(o.formacao, 20, (x) => {
      const curso = txt(x.curso, 120);
      return curso ? { inicio: ano(x.inicio), fim: ano(x.fim), curso, instituicao: txt(x.instituicao, 120), descricao: bloco(x.descricao, 600) } : null;
    }),
    experiencias: lista(o.experiencias, 20, (x) => {
      const cargo = txt(x.cargo, 120);
      return cargo ? { inicio: ano(x.inicio), fim: x.atual ? '' : ano(x.fim), atual: Boolean(x.atual), cargo, empresa: txt(x.empresa, 120), descricao: bloco(x.descricao, 1200) } : null;
    }),
    habilidades: Array.isArray(o.habilidades) ? o.habilidades.map((h) => txt(h, 40)).filter(Boolean).slice(0, 20) : [],
  };
}

export const periodo = (inicio: string, fim: string, atual = false) => (inicio ? `${inicio}${atual ? ' - Atualmente' : fim && fim !== inicio ? ` - ${fim}` : ''}` : '');

const SECAO = /^\s*(\d+\s*[.)-]?\s*)?(dados pessoais|idiomas?|forma[cç][aã]o( acad[eê]mica)?|escolaridade|experi[eê]ncias?( profissional| profissionais)?|cursos?( complementares)?|habilidades|qualifica[cç][oõ]es|objetivo)\s*:?\s*$/i;
const DATADA = /^\s*(\d{4})\s*(?:[–-]\s*(\d{4}|atualmente|atual|hoje))?\s*[–-]\s*(.+)$/i;

// Lê um currículo no formato "ano - curso - instituição" e "ano - Atualmente - cargo em empresa".
export function cvDoTexto(texto: string): Cv & { telefone?: string; email?: string } {
  const linhas = texto.split(/\r?\n/).map((l) => l.replace(/[​ ]/g, ' ').trim()).filter(Boolean);
  const cv: Cv & { telefone?: string; email?: string } = { idiomas: [], formacao: [], experiencias: [], habilidades: [] };
  let secao = '';
  let ultimo: Formacao | Experiencia | null = null;
  const campo = (l: string, nome: RegExp) => (nome.test(l) ? l.replace(nome, '').trim() : null);
  for (const l of linhas) {
    const s = SECAO.exec(l);
    if (s) {
      const n = s[2]!.toLowerCase();
      secao = n.startsWith('dados') ? 'dados' : n.startsWith('idioma') ? 'idiomas' : n.startsWith('experi') ? 'exp' : n.startsWith('habil') || n.startsWith('qualif') ? 'habil' : n.startsWith('objet') ? 'objetivo' : 'formacao';
      ultimo = null;
      continue;
    }
    if (secao === 'dados') {
      const civil = campo(l, /^estado civil\s*:\s*/i);
      if (civil !== null) cv.estadoCivil = ESTADOS_CIVIS.find((e) => e && e.toLowerCase().startsWith(civil.toLowerCase().slice(0, 5))) ?? '';
      const nasc = campo(l, /^(data de )?nascimento\s*:\s*/i);
      const m = nasc && /(\d{2})\/(\d{2})\/(\d{4})/.exec(nasc);
      if (m) cv.nascimento = `${m[3]}-${m[2]}-${m[1]}`;
      const end = campo(l, /^endere[cç]o\s*:\s*/i);
      if (end) cv.endereco = end;
      const port = campo(l, /^(portf[oó]lio|site|linkedin)\s*:\s*/i);
      if (port) cv.portfolio = port;
      const tel = campo(l, /^(telefone|celular|whatsapp)\s*:\s*/i);
      if (tel && telefoneValido(normalizarTelefone(tel))) cv.telefone = normalizarTelefone(tel);
      const mail = campo(l, /^e-?mail\s*:\s*/i);
      if (mail) cv.email = mail.toLowerCase();
      continue;
    }
    if (secao === 'idiomas') {
      const [lingua, ...resto] = l.split(/\s+|\s*[-:–]\s*/).filter(Boolean);
      const nivel = NIVEIS.find((n) => resto.join(' ').toLowerCase().includes(n.toLowerCase()));
      if (lingua && cv.idiomas!.length < 10) cv.idiomas!.push({ lingua, nivel: nivel ?? 'Básico' });
      continue;
    }
    if (secao === 'objetivo') {
      cv.objetivo = l.slice(0, 160);
      continue;
    }
    if (secao === 'habil') {
      cv.habilidades!.push(...l.split(/[,;•]/).map((h) => h.trim()).filter(Boolean));
      continue;
    }
    const d = DATADA.exec(l);
    if (d && (secao === 'formacao' || secao === 'exp')) {
      const [, inicio, fimBruto, resto] = d;
      const atual = Boolean(fimBruto && /atual|hoje/i.test(fimBruto));
      const fim = fimBruto && !atual ? fimBruto : '';
      let corpo = resto!.replace(/^(atualmente|atual|hoje)\s*[–-]\s*/i, '');
      const eraAtual = atual || /^(atualmente|atual)\b/i.test(resto!);
      if (secao === 'exp') {
        const em = corpo.match(/^(.+?)\s+(?:em|na|no)\s+(.+)$/i);
        ultimo = { inicio: inicio!, fim: eraAtual ? '' : fim, atual: eraAtual, cargo: (em ? em[1]! : corpo).trim(), empresa: em ? em[2]!.trim() : '', descricao: '' };
        cv.experiencias!.push(ultimo as Experiencia);
      } else {
        corpo = corpo.replace(/\s*[:.]\s*$/, '');
        const partes = corpo.split(/\s+[–-]\s+/);
        const instituicao = partes.length > 1 ? partes.pop()! : '';
        const [curso, ...desc] = partes.join(' - ').split(/:\s+/);
        ultimo = { inicio: inicio!, fim: fim || (eraAtual ? '' : ''), curso: curso!.trim(), instituicao: instituicao.trim(), descricao: desc.join(': ').trim() };
        cv.formacao!.push(ultimo as Formacao);
      }
      continue;
    }
    if (ultimo) ultimo.descricao = `${ultimo.descricao ? `${ultimo.descricao} ` : ''}${l}`.trim();
  }
  return cv;
}
