import { normalizar } from './texto';

// Barra o que é golpe comum ou anúncio discriminatório. A lista depende de revisão
// jurídica; a denúncia e a moderação cobrem o que escapar daqui.
const GOLPE: RegExp[] = [
  /\btaxa\s+de\s+(inscricao|cadastro|adesao|uniforme|treinamento|exame|matricula)\b/,
  /\b(pagar|paga|pague|pagamento\s+de)\s+(uma\s+)?taxa\b/,
  /\binvestimento\s+inicial\b/,
  /\b(compra|comprar|adquirir)\s+(de\s+|do\s+|o\s+|um\s+)?(kit|curso)\b/,
  /\bcurso\s+(obrigatorio\s+)?pago\b/,
  /\bganhos?\s+garantidos?\b/,
  /\brenda\s+extra\s+garantida\b/,
];

const DISCRIMINACAO: RegExp[] = [
  /\bboa\s+aparencia\b/,
  /\bsexo\s+(masculino|feminino)\b/,
  /\b(somente|apenas|so)\s+(para\s+)?(homens|mulheres|rapazes|mocas)\b/,
  /\bsem\s+filhos\b/,
  /\bsolteir[oa]s?\b/,
  /\bidade\s+(maxima|limite)\b/,
  /\b(ate|maximo\s+de)\s+\d{2}\s+anos\b(?!\s+de\s+(experiencia|atuacao|mercado))/,
  /\b(raca|cor\s+da\s+pele)\b/,
];

export type Revisao = { motivo: 'golpe' | 'discriminacao'; mensagem: string } | null;

export function revisarTexto(texto: string): Revisao {
  const t = normalizar(texto);
  if (GOLPE.some((r) => r.test(t))) return { motivo: 'golpe', mensagem: 'Retire a cobrança do candidato: taxa, kit, curso pago ou ganho garantido não são aceitos em vagas.' };
  if (DISCRIMINACAO.some((r) => r.test(t))) return { motivo: 'discriminacao', mensagem: 'Retire exigências de aparência, sexo, idade, estado civil, filhos ou cor. Descreva só o que o trabalho pede.' };
  return null;
}
