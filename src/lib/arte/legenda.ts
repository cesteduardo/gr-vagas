import { paraSlug } from '@/lib/texto';

export type DadosLegenda = { titulo: string; empresa: string; cidade: string; uf: string; contrato: string; modalidade: string; salario: string; beneficios: string; requisitos: string; area: string; link: string };
export const ESTILOS_LEGENDA = [
  { id: 'instagram', nome: 'Instagram' },
  { id: 'whatsapp', nome: 'WhatsApp' },
  { id: 'curta', nome: 'Curta' },
] as const;
export type EstiloLegenda = (typeof ESTILOS_LEGENDA)[number]['id'];

const itens = (t: string, limite = 4, tamanho = 70) =>
  t
    .split(/\n|;|•/)
    .map((x) => x.replace(/^[-*\s]+/, '').replace(/[.\s]+$/, '').trim())
    .filter((x) => x.length >= 2 && x.length <= tamanho)
    .slice(0, limite);

const palavraHashtag = (t: string) => t.split(/\s+/).filter((p) => p.length > 2).map((p) => paraSlug(p).replace(/-/g, '')).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

function hashtags(d: DadosLegenda): string {
  const cidade = d.cidade === 'São José do Rio Preto' ? 'RioPreto' : palavraHashtag(d.cidade);
  const cargo = palavraHashtag(d.titulo);
  return [`#Vagas${cidade}`, `#Emprego${cidade}`, `#${cidade}`, '#VagasDeEmprego', ...(cargo && cargo.length <= 24 ? [`#Vaga${cargo}`] : [])].join(' ');
}

const salarioTexto = (s: string) => (s === 'A combinar' ? 'a combinar' : s);

export type PartesLegenda = { abertura: string; detalhes: string; beneficios: string; requisitos: string; candidatura: string; final: string };
export const CAMPOS_LEGENDA: { id: keyof PartesLegenda; nome: string }[] = [
  { id: 'abertura', nome: 'Abertura' },
  { id: 'detalhes', nome: 'Salário, contrato e local' },
  { id: 'beneficios', nome: 'Benefícios' },
  { id: 'requisitos', nome: 'Requisitos' },
  { id: 'candidatura', nome: 'Como se candidatar' },
  { id: 'final', nome: 'Fechamento e hashtags' },
];

// Legenda pronta em partes, só com o que está na vaga: nada de benefício ou número inventado.
export function partesDaLegenda(d: DadosLegenda, estilo: EstiloLegenda): PartesLegenda {
  const beneficios = itens(d.beneficios);
  const requisitos = itens(d.requisitos);
  const condicoes = `${d.contrato}, ${d.modalidade.toLowerCase()}`;
  if (estilo === 'curta') {
    return { abertura: `${d.empresa} está contratando: ${d.titulo}, em ${d.cidade}.`, detalhes: `${condicoes}. Salário ${salarioTexto(d.salario)}.`, beneficios: '', requisitos: '', candidatura: `Candidate-se: ${d.link}`, final: '' };
  }
  if (estilo === 'whatsapp') {
    return {
      abertura: `*Vaga: ${d.titulo}*\n${d.empresa}, ${d.cidade} - ${d.uf}`,
      detalhes: `*Salário:* ${salarioTexto(d.salario)}\n*Contrato:* ${condicoes}`,
      beneficios: beneficios.length ? ['*Benefícios:*', ...beneficios.map((b) => `- ${b}`)].join('\n') : '',
      requisitos: requisitos.length ? ['*Requisitos:*', ...requisitos.map((b) => `- ${b}`)].join('\n') : '',
      candidatura: `*Candidate-se aqui:* ${d.link}`,
      final: 'Conhece alguém que combina? Encaminhe esta mensagem.',
    };
  }
  return {
    abertura: `${d.titulo}: estamos contratando em ${d.cidade}!\n\nA ${d.empresa} tem uma vaga aberta para quem quer começar logo.`,
    detalhes: `Salário: ${salarioTexto(d.salario)}\nContrato: ${condicoes}\nLocal: ${d.cidade} - ${d.uf}`,
    beneficios: beneficios.length ? ['O que oferecemos:', ...beneficios.map((b) => `✓ ${b}`)].join('\n') : '',
    requisitos: requisitos.length ? ['O que procuramos:', ...requisitos.map((b) => `✓ ${b}`)].join('\n') : '',
    candidatura: `Para se candidatar, aponte a câmera para o QR Code da arte ou acesse ${d.link}\nÉ sem cadastro e sem pagar nada.`,
    final: `Marque aqui quem está procurando emprego.\n\n${hashtags(d)}`,
  };
}

export const juntarLegenda = (p: PartesLegenda, estilo: EstiloLegenda) => CAMPOS_LEGENDA.map((c) => p[c.id].trim()).filter(Boolean).join(estilo === 'curta' ? '\n\n' : '\n\n');

export function legendaDaVaga(d: DadosLegenda, estilo: EstiloLegenda): string {
  const p = partesDaLegenda(d, estilo);
  if (estilo === 'curta') return `${p.abertura} ${p.detalhes}\n\n${p.candidatura}`;
  return juntarLegenda(p, estilo);
}
