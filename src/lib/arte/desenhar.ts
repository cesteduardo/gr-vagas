import QRCode from 'qrcode';
import { contraste, TINTA } from './cores';
import { montarArte, type DadosArte, type Medir, type OpcoesArte } from './layout';
import { fontePorId } from './modelos';

type Fonte = ReturnType<typeof fontePorId>;

// Ícones de traço em grade de 24, desenhados aqui mesmo.
const ICONES = {
  dinheiro: 'M3 7h18v10H3z M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M6.5 10v4 M17.5 10v4',
  pin: 'M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
  maleta: 'M3.5 8h17v11h-17z M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8 M3.5 13h17',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const;
const css = (f: Fonte, tamanho: number, peso: number) => `${peso} ${tamanho}px ${f.familia}, ${f.reserva}`;

const prontas = new Map<string, Promise<unknown>>();
export function carregarFonte(id: string) {
  const f = fontePorId(id);
  let p = prontas.get(f.id);
  if (!p) {
    p = Promise.all([400, 500, f.peso].map((peso) => document.fonts.load(css(f, 40, peso), 'Vaga ação'))).catch(() => null);
    prontas.set(f.id, p);
  }
  return p;
}

// Mesmos formatos do GR Brands QR Codes: módulos redondos e olhos arredondados.
function desenharQr(ctx: CanvasRenderingContext2D, link: string, x: number, y: number, lado: number, cor: string, estilo: 'suave' | 'pontos') {
  const qr = QRCode.create(link, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(x, y, lado, lado, lado * 0.16);
  ctx.fill();
  // Quatro módulos de margem branca são o que o padrão pede para a câmera ler.
  const m = lado / (n + 8);
  const ox = x + m * 4;
  const oy = y + m * 4;
  // O QR Code só é lido com tinta bem escura sobre o branco.
  ctx.fillStyle = contraste(cor, '#FFFFFF') >= 4.5 ? cor : TINTA;
  const olho = (l: number, c: number) => (l < 7 && c < 7) || (l < 7 && c >= n - 7) || (l >= n - 7 && c < 7);
  for (let l = 0; l < n; l += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!qr.modules.get(l, c) || olho(l, c)) continue;
      ctx.beginPath();
      if (estilo === 'pontos') ctx.arc(ox + (c + 0.5) * m, oy + (l + 0.5) * m, m * 0.46, 0, Math.PI * 2);
      else ctx.roundRect(ox + c * m + m * 0.01, oy + l * m + m * 0.01, m * 0.98, m * 0.98, m * 0.26);
      ctx.fill();
    }
  }
  for (const [l, c] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    const [px, py] = [ox + c * m, oy + l * m];
    ctx.beginPath();
    ctx.roundRect(px, py, m * 7, m * 7, m * 2);
    ctx.roundRect(px + m, py + m, m * 5, m * 5, m * 1.2);
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.roundRect(px + m * 2, py + m * 2, m * 3, m * 3, m * 0.9);
    ctx.fill();
  }
}

export type Imagem = CanvasImageSource & { width: number; height: number };

export function desenharArte(canvas: HTMLCanvasElement, dados: DadosArte & { qr: string }, opcoes: OpcoesArte & { fonte: string; qrEstilo: 'suave' | 'pontos'; focoX?: number; focoY?: number }, logo: Imagem | null, imagem: Imagem | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const f = fontePorId(opcoes.fonte);
  // Títulos justos nas fontes sem serifa; serifas pedem o espaçamento natural.
  const espacar = (tamanho: number, justo: boolean) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(justo ? (f.justo ? -0.04 : -0.008) : -0.008) * tamanho}px`;
  };
  const medir: Medir = (t, tam, peso, justo) => {
    ctx.font = css(f, tam, peso);
    espacar(tam, justo);
    return ctx.measureText(t).width;
  };
  const arte = montarArte({ ...dados, temLogo: Boolean(logo), temImagem: Boolean(imagem) }, { ...opcoes, pesoTitulo: f.peso }, medir);
  canvas.width = arte.largura;
  canvas.height = arte.altura;
  ctx.textBaseline = 'middle';
  for (const e of arte.elementos) {
    if (e.tipo === 'ret') {
      ctx.fillStyle = e.cor;
      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.l, e.a, e.raio ?? 0);
      ctx.fill();
    } else if (e.tipo === 'imagem' && imagem) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.l, e.a, e.raio);
      ctx.clip();
      const escala = Math.max(e.l / imagem.width, e.a / imagem.height);
      const [l, a] = [imagem.width * escala, imagem.height * escala];
      // O contratante escolhe qual parte da foto fica à vista.
      ctx.drawImage(imagem, e.x + (e.l - l) * ((opcoes.focoX ?? 50) / 100), e.y + (e.a - a) * ((opcoes.focoY ?? 50) / 100), l, a);
      ctx.restore();
    } else if (e.tipo === 'texto') {
      ctx.font = css(f, e.tamanho, e.peso);
      espacar(e.tamanho, e.justo);
      ctx.fillStyle = e.cor;
      const passo = e.tamanho * e.alturaLinha;
      const sobra = e.a - passo * e.linhas.length;
      const inicio = e.fimV ? e.y + sobra : e.centrarV ? e.y + sobra / 2 : e.y;
      ctx.textAlign = e.centroX ? 'center' : 'left';
      e.linhas.forEach((linha, i) => {
        if (e.coresLinhas?.length) ctx.fillStyle = e.coresLinhas[i % e.coresLinhas.length]!;
        ctx.fillText(linha, e.centroX ? e.x + e.l / 2 : e.x, inicio + passo * i + passo / 2);
      });
      ctx.textAlign = 'left';
    } else if (e.tipo === 'circulo') {
      ctx.globalAlpha = e.alfa ?? 1;
      ctx.fillStyle = e.cor;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.raio, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.tipo === 'tracejado') {
      ctx.strokeStyle = e.cor;
      ctx.lineWidth = e.espessura;
      ctx.lineCap = 'round';
      ctx.setLineDash([e.espessura * 3, e.espessura * 3.5]);
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (e.tipo === 'degrade') {
      const g = ctx.createLinearGradient(0, e.y, 0, e.y + e.a);
      g.addColorStop(0, e.de);
      g.addColorStop(1, e.para);
      ctx.fillStyle = g;
      ctx.fillRect(e.x, e.y, e.l, e.a);
    } else if (e.tipo === 'icone') {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(e.l / 24, e.a / 24);
      ctx.strokeStyle = e.cor;
      ctx.lineWidth = e.espessura ?? 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(ICONES[e.nome]));
      ctx.restore();
    } else if (e.tipo === 'qr') {
      desenharQr(ctx, dados.qr, e.x, e.y, e.l, opcoes.texto, opcoes.qrEstilo);
    } else if (e.tipo === 'logo' && logo) {
      const escala = Math.min(e.l / logo.width, e.a / logo.height);
      const [l, a] = [logo.width * escala, logo.height * escala];
      ctx.drawImage(logo, e.x + (e.l - l) / 2, e.y + (e.a - a) / 2, l, a);
    }
  }
}

// Cores mais presentes numa imagem, para sugerir a paleta a partir do logo.
export function coresDaImagem(img: Imagem, quantas = 4): string[] {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  const contagem = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 200) continue;
    const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
    const [mx, mn] = [Math.max(r, g, b), Math.min(r, g, b)];
    if (mx > 240 && mn > 240) continue;
    if (mx < 18) continue;
    const chave = `#${[r, g, b].map((v) => (Math.round(v / 24) * 24).toString(16).padStart(2, '0').slice(-2)).join('')}`.toUpperCase();
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, quantas).map(([k]) => k);
}
