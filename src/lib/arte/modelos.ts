export const corValida = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

export const MODELOS = [
  { id: 'cartao', nome: 'Cartão' },
  { id: 'poster', nome: 'Pôster' },
  { id: 'dividida', nome: 'Dividida' },
  { id: 'ingresso', nome: 'Ingresso' },
  { id: 'bolhas', nome: 'Bolhas' },
  { id: 'lista', nome: 'Ficha' },
  { id: 'tipografica', nome: 'Tipográfica' },
  { id: 'foto', nome: 'Com foto' },
  { id: 'fotointeira', nome: 'Foto inteira' },
] as const;
// Nomes antigos, para artes salvas antes da troca de modelos.
export const MODELOS_ANTIGOS: Record<string, string> = { placa: 'cartao', faixa: 'lista', coluna: 'bolhas', noturno: 'poster', cartaz: 'tipografica', etiqueta: 'ingresso' };
export type ModeloId = (typeof MODELOS)[number]['id'];

export const FORMATOS = [
  { id: 'feed', nome: 'Feed', uso: 'Instagram e Facebook', largura: 1080, altura: 1080 },
  { id: 'retrato', nome: 'Retrato', uso: 'Feed em tela cheia', largura: 1080, altura: 1350 },
  { id: 'stories', nome: 'Stories', uso: 'Status e Stories', largura: 1080, altura: 1920 },
] as const;
export type FormatoId = (typeof FORMATOS)[number]['id'];

export const FONTES = [
  { id: 'inter', nome: 'Inter', familia: '"Inter Variable"', reserva: 'Arial, sans-serif', peso: 600, justo: true },
  { id: 'poppins', nome: 'Poppins', familia: 'Poppins', reserva: 'Arial, sans-serif', peso: 600, justo: true },
  { id: 'manrope', nome: 'Manrope', familia: '"Manrope Variable"', reserva: 'Arial, sans-serif', peso: 700, justo: true },
  { id: 'montserrat', nome: 'Montserrat', familia: '"Montserrat Variable"', reserva: 'Arial, sans-serif', peso: 700, justo: true },
  { id: 'dmsans', nome: 'DM Sans', familia: '"DM Sans Variable"', reserva: 'Arial, sans-serif', peso: 600, justo: true },
  { id: 'nunito', nome: 'Nunito', familia: '"Nunito Variable"', reserva: 'Arial, sans-serif', peso: 800, justo: false },
  { id: 'playfair', nome: 'Playfair Display', familia: '"Playfair Display Variable"', reserva: 'Georgia, serif', peso: 600, justo: false },
  { id: 'lora', nome: 'Lora', familia: '"Lora Variable"', reserva: 'Georgia, serif', peso: 600, justo: false },
  // Tinos tem as mesmas medidas da Times New Roman e funciona em qualquer aparelho.
  { id: 'times', nome: 'Times New Roman', familia: '"Times New Roman", Tinos', reserva: 'serif', peso: 700, justo: false },
] as const;
export type FonteId = (typeof FONTES)[number]['id'];
export const fontePorId = (id: string) => FONTES.find((f) => f.id === id) ?? FONTES[0];

export const CHAMADAS = ['Estamos contratando', 'Vaga aberta', 'Precisa-se', 'Vem com a gente', 'Temos vaga'] as const;

// Tons lavados, como os dos celulares: claros, com pouca saturação.
export const PALETAS = [
  { nome: 'Céu', fundo: '#DCEBFB', destaque: '#7FAEE3', texto: '#14213D' },
  { nome: 'Pêssego', fundo: '#FFE7D9', destaque: '#F79C6B', texto: '#3B1F10' },
  { nome: 'Menta', fundo: '#DDF2E7', destaque: '#6DBE9B', texto: '#10312A' },
  { nome: 'Lavanda', fundo: '#E9E3F8', destaque: '#A493DE', texto: '#241B45' },
  { nome: 'Areia', fundo: '#F3EDE3', destaque: '#CBB48F', texto: '#2E261A' },
  { nome: 'Rosé', fundo: '#FBE4E8', destaque: '#E79AAB', texto: '#3D1721' },
  { nome: 'Titânio', fundo: '#E7E8EC', destaque: '#8E93A3', texto: '#14161B' },
  { nome: 'Grafite', fundo: '#23262E', destaque: '#FFC9A8', texto: '#F6F6F7' },
] as const;

export const ARTE_PADRAO = { modelo: 'cartao', formato: 'feed', fundo: '#DCEBFB', destaque: '#F79C6B', texto: '#14213D', fonte: 'inter', chamada: 'Estamos contratando', qr: 'vaga', qrEstilo: 'suave', whatsapp: '' } as const;
