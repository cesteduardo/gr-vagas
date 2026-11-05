// Tudo que ainda depende de decisão do Eduardo fica aqui, em um lugar só.
export const NOME = 'GR Vagas';

export const URL_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4820').replace(/\/$/, '');

// Link de acesso por e-mail só em https fora da demonstração: em http o token viajaria aberto.
export function urlSiteSegura(): boolean {
  return URL_SITE.startsWith('https://') || process.env.NODE_ENV !== 'production' || process.env.SIMULADOR === '1';
}

// Enquanto SITE_PUBLICO não for 1, nada é indexado: o produto não está lançado.
export const SITE_PUBLICO = process.env.SITE_PUBLICO === '1';

// O modo de demonstração nunca liga em produção, a não ser pedindo de forma explícita.
export const SIMULADOR = process.env.SIMULADOR === '1' || (process.env.NODE_ENV !== 'production' && process.env.SIMULADOR !== '0');

export const VALIDADE_VAGA_DIAS = 30;

export type Cidade = { slug: string; nome: string; uf: string; pais: string };
const sp = (slug: string, nome: string): Cidade => ({ slug, nome, uf: 'SP', pais: 'BR' });
// Primeira praça. Abrir outra cidade é acrescentar uma linha aqui.
export const CIDADES: Cidade[] = [
  sp('sao-jose-do-rio-preto', 'São José do Rio Preto'),
  sp('mirassol', 'Mirassol'),
  sp('bady-bassitt', 'Bady Bassitt'),
  sp('cedral', 'Cedral'),
  sp('guapiacu', 'Guapiaçu'),
  sp('ipigua', 'Ipiguá'),
  sp('onda-verde', 'Onda Verde'),
  sp('nova-alianca', 'Nova Aliança'),
  sp('potirendaba', 'Potirendaba'),
  sp('uchoa', 'Uchoa'),
  sp('tanabi', 'Tanabi'),
  sp('monte-aprazivel', 'Monte Aprazível'),
  sp('jose-bonifacio', 'José Bonifácio'),
  sp('catanduva', 'Catanduva'),
];
export const CIDADE_PRINCIPAL = CIDADES[0]!;
export const cidadePorSlug = (slug: string) => CIDADES.find((c) => c.slug === slug) ?? null;

export const AREAS = [
  'Administrativo',
  'Atendimento e vendas',
  'Comércio e varejo',
  'Construção e manutenção',
  'Educação',
  'Financeiro e contábil',
  'Indústria e produção',
  'Limpeza e serviços gerais',
  'Logística e transporte',
  'Marketing e comunicação',
  'Recursos humanos',
  'Restaurantes e alimentação',
  'Saúde',
  'Tecnologia',
  'Outra área',
] as const;

export const CONTRATOS = ['CLT', 'PJ', 'Estágio', 'Jovem aprendiz', 'Temporário', 'Freelancer'] as const;
export const MODALIDADES = ['Presencial', 'Híbrido', 'Remoto'] as const;

export const ETAPAS = [
  { id: 'novo', rotulo: 'Novo' },
  { id: 'analise', rotulo: 'Em análise' },
  { id: 'entrevista', rotulo: 'Entrevista' },
  { id: 'contratado', rotulo: 'Contratado' },
  { id: 'nao_seguiu', rotulo: 'Não seguiu' },
] as const;
export type Etapa = (typeof ETAPAS)[number]['id'];

// Valores de referência, ainda não decididos.
export const PRECOS_PROVISORIOS = true;

// Impulso de vaga na tela inicial, pago à parte de qualquer plano. Valores provisórios.
export const IMPULSOS = [
  { dias: 7, preco: 19.9 },
  { dias: 15, preco: 34.9 },
  { dias: 30, preco: 59.9 },
] as const;
export type PlanoId = 'gratis' | 'essencial' | 'profissional' | 'plus';

export type Limites = { vagasAbertas: number; marcaNaArte: boolean; destaques: number; talentos: boolean; alertaImediato: boolean; plus: boolean };

// Personalizar a arte é grátis para todos: arte bonita é o que faz o site circular.
export const LIMITES: Record<PlanoId, Limites> = {
  gratis: { vagasAbertas: 2, marcaNaArte: true, destaques: 0, talentos: false, alertaImediato: false, plus: false },
  essencial: { vagasAbertas: 6, marcaNaArte: false, destaques: 1, talentos: false, alertaImediato: false, plus: false },
  profissional: { vagasAbertas: 30, marcaNaArte: false, destaques: 5, talentos: true, alertaImediato: false, plus: false },
  plus: { vagasAbertas: 0, marcaNaArte: true, destaques: 0, talentos: false, alertaImediato: true, plus: true },
};

export const PLANOS_EMPRESA = [
  { id: 'gratis' as const, nome: 'Grátis', preco: 0, resumo: 'Para a próxima vaga da sua empresa.', itens: ['2 vagas abertas por vez', 'Arte com todas as cores, fontes e modelos', 'QR Code da vaga ou do seu WhatsApp', 'Candidatos e conversa sem limite', 'Marca do GR Vagas na arte'] },
  { id: 'essencial' as const, nome: 'Essencial', preco: 49, resumo: 'Para quem contrata todo mês.', itens: ['6 vagas abertas por vez', 'Arte sem a marca do GR Vagas', '1 vaga em destaque no topo da busca', 'Candidatos e conversa sem limite'] },
  { id: 'profissional' as const, nome: 'Profissional', preco: 129, resumo: 'Para RHs e agências com várias vagas.', itens: ['30 vagas abertas por vez', 'Tudo do Essencial', '5 vagas em destaque', 'Banco de talentos'] },
];

export const PLANOS_CANDIDATO = [
  { id: 'gratis' as const, nome: 'Grátis', preco: 0, resumo: 'Tudo para procurar emprego, sempre.', itens: ['Pesquisar vagas', 'Candidatura com um arquivo só', 'Conversa com as empresas', 'Alerta diário por e-mail'] },
  { id: 'plus' as const, nome: 'Plus', preco: 9.9, resumo: 'Para sair na frente nas candidaturas.', itens: ['Sua candidatura aparece primeiro para a empresa', 'Currículo bonito pronto em PDF', 'Quanto cada vaga combina com você', 'Saber quando a empresa abriu sua candidatura', 'Alerta assim que a vaga sai', 'Destaque no banco de talentos'] },
];

export const precoEmReais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const planosDoTipo = (tipo: 'contratante' | 'candidato') => (tipo === 'contratante' ? PLANOS_EMPRESA : PLANOS_CANDIDATO);
