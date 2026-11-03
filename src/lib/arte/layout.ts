import { textoLegivel, TINTA } from './cores';
import { FORMATOS, type FormatoId, type ModeloId } from './modelos';

export type Medir = (texto: string, tamanho: number, peso: number, justo: boolean) => number;
export type DadosArte = { titulo: string; empresa: string; cidade: string; contrato: string; modalidade: string; salario: string; link: string; cta: string; destaques: string[]; temLogo: boolean; temImagem: boolean };
export type OpcoesArte = { modelo: ModeloId; formato: FormatoId; fundo: string; destaque: string; texto: string; chamada: string; marca: boolean; pesoTitulo?: number; alinhamento?: 'esquerda' | 'centro'; posicao?: 'topo' | 'meio' | 'base' };

export type Caixa = { x: number; y: number; l: number; a: number };
export type Icone = 'dinheiro' | 'pin' | 'maleta' | 'check';
export type Elemento =
  | ({ tipo: 'ret'; cor: string; raio?: number } & Caixa)
  | ({ tipo: 'texto'; linhas: string[]; tamanho: number; peso: number; justo: boolean; cor: string; alturaLinha: number; centrarV: boolean; fimV?: boolean; centroX?: boolean; coresLinhas?: string[] } & Caixa)
  | ({ tipo: 'icone'; nome: Icone; cor: string; espessura?: number } & Caixa)
  | { tipo: 'circulo'; x: number; y: number; raio: number; cor: string; alfa?: number }
  | { tipo: 'tracejado'; x1: number; y1: number; x2: number; y2: number; cor: string; espessura: number }
  | ({ tipo: 'degrade'; de: string; para: string } & Caixa)
  | ({ tipo: 'imagem'; raio: number } & Caixa)
  | ({ tipo: 'qr' } & Caixa)
  | ({ tipo: 'logo' } & Caixa);

type Ajuste = { largura: number; altura: number; max: number; min: number; alturaLinha: number; peso: number; justo: boolean };

function quebrar(texto: string, largura: number, mede: (t: string) => number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.trim().split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (mede(tentativa) <= largura) {
      atual = tentativa;
      continue;
    }
    if (atual) linhas.push(atual);
    atual = '';
    if (mede(palavra) <= largura) {
      atual = palavra;
      continue;
    }
    // Palavra maior que a linha é cortada letra a letra.
    for (const letra of palavra) {
      if (atual && mede(atual + letra) > largura) {
        linhas.push(atual);
        atual = '';
      }
      atual += letra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'para', 'com', 'na', 'no']);

// Divide as linhas por igual, sem deixar palavra sozinha nem "de" no fim da linha.
function equilibrar(linhas: string[], largura: number, mede: (t: string) => number): string[] {
  if (linhas.length < 2) return linhas;
  const texto = linhas.join(' ');
  // Nunca mais estreito que a maior palavra: equilibrar não pode cortar palavra.
  let [baixo, alto] = [Math.max(largura * 0.4, ...texto.split(' ').map(mede)), largura];
  let melhor = linhas;
  for (let i = 0; i < 12; i += 1) {
    const meio = (baixo + alto) / 2;
    const tentativa = quebrar(texto, meio, mede);
    if (tentativa.length <= linhas.length && tentativa.every((l) => mede(l) <= meio)) {
      melhor = tentativa;
      alto = meio;
    } else baixo = meio;
  }
  const r = [...melhor];
  for (let i = 0; i < r.length - 1; i += 1) {
    const partes = r[i]!.split(' ');
    const ultima = partes.at(-1)!;
    if (partes.length > 1 && CONECTIVOS.has(ultima.toLowerCase()) && mede(`${ultima} ${r[i + 1]}`) <= largura) {
      r[i] = partes.slice(0, -1).join(' ');
      r[i + 1] = `${ultima} ${r[i + 1]}`;
    }
  }
  return r;
}

export function ajustarTexto(texto: string, a: Ajuste, medir: Medir): { linhas: string[]; tamanho: number } {
  const passo = Math.max(1, Math.round(a.max / 40));
  const palavras = texto.trim().split(/\s+/);
  // Primeiro tenta sem cortar palavra: letra menor é melhor que "Recepcionis-ta".
  for (const inteiras of [true, false]) {
    for (let t = a.max; t >= a.min; t -= passo) {
      const mede = (s: string) => medir(s, t, a.peso, a.justo);
      if (inteiras && palavras.some((p) => mede(p) > a.largura)) continue;
      const linhas = quebrar(texto, a.largura, mede);
      if (linhas.length * t * a.alturaLinha <= a.altura) return { linhas: inteiras ? equilibrar(linhas, a.largura, mede) : linhas, tamanho: t };
    }
  }
  const mede = (s: string) => medir(s, a.min, a.peso, a.justo);
  const cabem = Math.max(1, Math.floor(a.altura / (a.min * a.alturaLinha)));
  const linhas = quebrar(texto, a.largura, mede).slice(0, cabem);
  let ultima = linhas[cabem - 1] ?? linhas.at(-1) ?? '';
  while (ultima && mede(`${ultima}…`) > a.largura) ultima = ultima.slice(0, -1);
  linhas[linhas.length - 1] = `${ultima.trimEnd()}…`;
  return { linhas, tamanho: a.min };
}

const CLARO = '#F1F2F4';

// Nove modelos com estrutura própria. Regras de todos: o cargo é o maior texto, o
// salário vem logo depois, nada abaixo de 24 px em 1080 e o QR Code sempre numa
// área branca com a instrução escrita embaixo.
export function montarArte(d: DadosArte, o: OpcoesArte, medir: Medir): { largura: number; altura: number; elementos: Elemento[] } {
  const f = FORMATOS.find((x) => x.id === o.formato) ?? FORMATOS[0];
  const { largura: W, altura: H } = f;
  const stories = o.formato === 'stories';
  const alta = H > W;
  const k = stories ? 1.2 : o.formato === 'retrato' ? 1.08 : 1;
  const r = (v: number) => Math.round(v * k);
  const TOPO = stories ? 210 : 64;
  const FIM = H - (stories ? 230 : 56);
  const X = 72;
  const L = W - X * 2;
  const peso = o.pesoTitulo ?? 600;
  const el: Elemento[] = [];
  const ink = (fundo: string, preferida = o.texto) => textoLegivel(fundo, preferida);
  const salario = d.salario === 'A combinar' ? 'Salário a combinar' : d.salario;
  const condicoes = `${d.contrato}, ${d.modalidade.toLowerCase()}`;

  type OpTexto = { max: number; min?: number; peso: number; justo?: boolean; cor: string; alturaLinha?: number; centrarV?: boolean; fimV?: boolean; coresLinhas?: string[] };
  const texto = (c: Caixa, conteudo: string, a: OpTexto) => {
    const alturaLinha = a.alturaLinha ?? 1.15;
    const justo = a.justo ?? false;
    const min = Math.min(a.max, a.min ?? 24);
    const { linhas, tamanho } = ajustarTexto(conteudo, { largura: c.l, altura: c.a, max: a.max, min, alturaLinha, peso: a.peso, justo }, medir);
    const alturaTexto = linhas.length * tamanho * alturaLinha;
    el.push({ tipo: 'texto', ...c, linhas, tamanho, peso: a.peso, justo, cor: a.cor, alturaLinha, centrarV: a.centrarV ?? false, fimV: a.fimV ?? false, coresLinhas: a.coresLinhas });
    return { altura: alturaTexto, tamanho, linhas: linhas.length };
  };

  // O cargo ocupa só a altura que precisa; quem chama decide onde ele encosta.
  const cargo = (c: Caixa, cor: string, max: number, onde: 'topo' | 'base' = 'base', coresLinhas?: string[]) => {
    const t = texto(c, d.titulo, { max, min: 40, peso, justo: true, cor, alturaLinha: 1.02, coresLinhas });
    const y = onde === 'topo' ? c.y : c.y + c.a - t.altura;
    const it = el.at(-1);
    if (it?.tipo === 'texto') {
      it.y = y;
      it.a = t.altura;
    }
    return { y, altura: t.altura };
  };

  const placaLogo = (px: number, py: number, lado: number) => {
    el.push({ tipo: 'ret', x: px, y: py, l: lado, a: lado, cor: '#FFFFFF', raio: lado * 0.3 });
    el.push({ tipo: 'logo', x: px + 8, y: py + 8, l: lado - 16, a: lado - 16 });
  };

  const cabeca = (x: number, y: number, l: number, cor: string, alt = r(72)) => {
    if (d.temLogo) placaLogo(x, y, alt);
    const nx = d.temLogo ? x + alt + 16 : x;
    texto({ x: nx, y, l: x + l - nx, a: alt }, d.empresa, { max: r(34), peso: 600, cor, alturaLinha: 1.12, centrarV: true });
    return y + alt;
  };

  const pilula = (x: number, y: number, conteudo: string, fundo: string, maxL = L) => {
    const a = r(52);
    const tam = r(27);
    const l = Math.min(maxL, medir(conteudo, tam, 600, false) + 48);
    el.push({ tipo: 'ret', x, y, l, a, cor: fundo, raio: a / 2 });
    texto({ x: x + 24, y, l: l - 48, a }, conteudo, { max: tam, peso: 600, cor: ink(fundo), centrarV: true });
    return y + a;
  };

  // Linha com ícone num círculo: salário, local e contrato.
  const ALT_LINHA = r(58);
  const linha = (x: number, y: number, l: number, icone: Icone, conteudo: string, a: { cor: string; fundoIcone: string; corIcone: string; peso?: number; max?: number }) => {
    const dI = Math.round(ALT_LINHA * 0.78);
    const yI = y + (ALT_LINHA - dI) / 2;
    el.push({ tipo: 'circulo', x: x + dI / 2, y: yI + dI / 2, raio: dI / 2, cor: a.fundoIcone });
    const lI = Math.round(dI * 0.56);
    el.push({ tipo: 'icone', nome: icone, x: x + (dI - lI) / 2, y: yI + (dI - lI) / 2, l: lI, a: lI, cor: a.corIcone });
    texto({ x: x + dI + 16, y, l: l - dI - 16, a: ALT_LINHA }, conteudo, { max: a.max ?? r(31), peso: a.peso ?? 500, cor: a.cor, alturaLinha: 1.12, centrarV: true });
    return y + ALT_LINHA;
  };
  const linhasPadrao = (x: number, y: number, l: number, a: { cor: string; fundoIcone: string; corIcone: string }, comSalario = true) => {
    let yy = y;
    if (comSalario) yy = linha(x, yy, l, 'dinheiro', salario, { ...a, peso: 700, max: r(34) });
    yy = linha(x, yy, l, 'pin', d.cidade, a);
    return linha(x, yy, l, 'maleta', condicoes, a);
  };

  const ALT_DEST = r(44);
  const destaquesLista = (x: number, y: number, l: number, cor: string, n: number) => {
    let yy = y;
    for (const b of d.destaques.slice(0, n)) {
      const lado = r(26);
      el.push({ tipo: 'icone', nome: 'check', x: x + 2, y: yy + (ALT_DEST - lado) / 2, l: lado, a: lado, cor, espessura: 3 });
      texto({ x: x + lado + 14, y: yy, l: l - lado - 14, a: ALT_DEST }, b, { max: r(29), peso: 500, cor, centrarV: true });
      yy += ALT_DEST;
    }
    return yy;
  };

  // QR Code com a instrução embaixo. Com placa, leva o próprio fundo branco.
  const LADO_QR = r(196);
  const PAD_QR = 16;
  const ALT_LEGENDA = r(62) + 30;
  const LARG_QR = LADO_QR + PAD_QR * 2;
  const ALT_QR = PAD_QR + LADO_QR + 8 + ALT_LEGENDA + PAD_QR;
  const qr = (x: number, y: number, comPlaca: boolean, fundoPlaca = '#FFFFFF') => {
    if (comPlaca) el.push({ tipo: 'ret', x, y, l: LARG_QR, a: ALT_QR, cor: fundoPlaca, raio: 32 });
    const cor = ink(comPlaca ? fundoPlaca : '#FFFFFF');
    el.push({ tipo: 'qr', x: x + PAD_QR, y: y + PAD_QR, l: LADO_QR, a: LADO_QR });
    const yl = y + PAD_QR + LADO_QR + 8;
    texto({ x: x + PAD_QR, y: yl, l: LADO_QR, a: r(62) }, d.cta, { max: r(25), peso: 700, cor, alturaLinha: 1.12 });
    texto({ x: x + PAD_QR, y: yl + r(62), l: LADO_QR, a: 30 }, d.link.replace(/^https?:\/\//, ''), { max: 24, peso: 400, cor, alturaLinha: 1.2, centrarV: true });
  };

  const ALT_MARCA = o.marca ? 30 : 0;
  const marca = (x: number, y: number, l: number, cor: string) => {
    if (o.marca) texto({ x, y, l, a: 30 }, 'Arte feita no GR Vagas', { max: 24, peso: 400, cor, alturaLinha: 1.2, centrarV: true });
  };

  // Heurística comum: se o cargo ficaria espremido, os benefícios cedem espaço primeiro.
  const quantos = (sobra: (n: number) => number, minimo: number) => {
    let n = Math.min(3, d.destaques.length);
    while (n > 0 && sobra(n) < minimo) n -= 1;
    return n;
  };

  // Sem foto, uma composição de formas no lugar, em vez de um bloco liso.
  const fundoImagem = (c: Caixa, raio: number) => {
    if (d.temImagem) {
      el.push({ tipo: 'imagem', ...c, raio });
      return;
    }
    el.push({ tipo: 'ret', ...c, cor: o.destaque, raio });
    const m = Math.min(c.l, c.a);
    el.push({ tipo: 'circulo', x: c.x + c.l * 0.78, y: c.y + c.a * 0.42, raio: m * 0.42, cor: o.fundo, alfa: 0.5 });
    el.push({ tipo: 'circulo', x: c.x + c.l * 0.2, y: c.y + c.a * 0.25, raio: m * 0.16, cor: '#FFFFFF', alfa: 0.35 });
    el.push({ tipo: 'circulo', x: c.x + c.l * 0.55, y: c.y + c.a * 0.8, raio: m * 0.08, cor: '#FFFFFF', alfa: 0.5 });
  };

  const fim = () => ({ largura: W, altura: H, elementos: el });

  switch (o.modelo) {
    case 'poster': {
      // Fundo de cor cheia, círculos grandes saindo da arte e chamada em pílula.
      const fundo = o.destaque;
      const tinta = ink(fundo);
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: fundo });
      el.push({ tipo: 'circulo', x: W * 0.95, y: TOPO + r(30), raio: W * 0.42, cor: o.fundo, alfa: 0.42 });
      el.push({ tipo: 'circulo', x: W * 0.02, y: H * 0.94, raio: W * 0.26, cor: '#FFFFFF', alfa: 0.22 });
      let y = cabeca(X, TOPO, L, tinta) + r(26);
      y = pilula(X, y, o.chamada, '#FFFFFF') + r(20);
      const yQr = FIM - ALT_QR;
      const larg = L - LARG_QR - 28;
      cargo({ x: X, y, l: L, a: yQr - r(28) - y }, tinta, r(150), 'topo');
      const altLinhas = ALT_LINHA * 3 + ALT_MARCA;
      linhasPadrao(X, FIM - altLinhas, larg, { cor: tinta, fundoIcone: '#FFFFFF', corIcone: ink('#FFFFFF', fundo) });
      marca(X, FIM - 30, larg, tinta);
      qr(X + L - LARG_QR, yQr, true);
      return fim();
    }

    case 'dividida': {
      // Metade colorida com o cargo; a outra metade, branca, com o que a pessoa precisa saber.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: '#FFFFFF' });
      const tintaCor = ink(o.destaque);
      const tinta = ink('#FFFFFF');
      const icones = { cor: tinta, fundoIcone: o.fundo, corIcone: ink(o.fundo) };
      if (!alta) {
        const sw = Math.round(W * 0.47);
        el.push({ tipo: 'ret', x: 24, y: 24, l: sw - 24, a: H - 48, cor: o.destaque, raio: 48 });
        const xl = 64;
        const ll = sw - 24 - 72;
        let y = cabeca(xl, TOPO, ll, tintaCor) + r(24);
        y = pilula(xl, y, o.chamada, '#FFFFFF', ll) + r(16);
        cargo({ x: xl, y, l: ll, a: FIM - y }, tintaCor, r(112), 'base');
        const xr = sw + 44;
        const lr = W - 64 - xr;
        const yQr = FIM - ALT_QR;
        const n = quantos((m) => yQr - 20 - (TOPO + ALT_LINHA * 3 + 16 + m * ALT_DEST + ALT_MARCA), 0);
        let yy = linhasPadrao(xr, TOPO, lr, icones) + 16;
        yy = destaquesLista(xr, yy, lr, tinta, n);
        marca(xr, yy + 6, lr, tinta);
        qr(xr - PAD_QR, yQr, false);
        return fim();
      }
      const altCor = Math.round(H * (stories ? 0.47 : 0.5));
      el.push({ tipo: 'ret', x: 24, y: 24, l: W - 48, a: altCor - 24, cor: o.destaque, raio: 48 });
      let y = cabeca(X, TOPO, L, tintaCor) + r(24);
      y = pilula(X, y, o.chamada, '#FFFFFF') + r(16);
      cargo({ x: X, y, l: L, a: altCor - 40 - y }, tintaCor, r(132), 'base');
      const larg = L - LARG_QR - 28;
      const y0 = altCor + 36;
      const n = quantos((m) => FIM - (y0 + ALT_LINHA * 3 + 16 + m * ALT_DEST + ALT_MARCA), 0);
      let yy = linhasPadrao(X, y0, larg, icones) + 16;
      yy = destaquesLista(X, yy, larg, tinta, n);
      marca(X, yy + 6, larg, tinta);
      qr(X + L - LARG_QR + PAD_QR, y0 - PAD_QR, false);
      return fim();
    }

    case 'ingresso': {
      // Um ingresso: parte de cima com o cargo, picote e canhoto com salário e QR Code.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: o.fundo });
      const x0 = 48;
      const y0 = stories ? 180 : 40;
      const y1 = H - (stories ? 210 : 40);
      el.push({ tipo: 'ret', x: x0, y: y0, l: W - x0 * 2, a: y1 - y0, cor: '#FFFFFF', raio: 48 });
      const tinta = ink('#FFFFFF');
      const lado = r(170);
      const altCanhoto = 28 + lado + 8 + ALT_LEGENDA + 24;
      const yPic = y1 - altCanhoto;
      el.push({ tipo: 'circulo', x: x0, y: yPic, raio: 28, cor: o.fundo });
      el.push({ tipo: 'circulo', x: W - x0, y: yPic, raio: 28, cor: o.fundo });
      el.push({ tipo: 'tracejado', x1: x0 + 44, y1: yPic, x2: W - x0 - 44, y2: yPic, cor: '#CDD1D8', espessura: 4 });
      const xi = x0 + 40;
      const li = W - (x0 + 40) * 2;
      const altEmp = r(64);
      const altBaixo = altEmp + 14 + ALT_LINHA * 2;
      const yTopo = y0 + 40;
      const espaco = yPic - 36 - yTopo;
      const aj = ajustarTexto(d.titulo, { largura: li, altura: espaco - r(52) - r(18) - r(16) - altBaixo, max: r(124), min: 40, alturaLinha: 1.02, peso, justo: true }, medir);
      const altTit = Math.ceil(aj.linhas.length * aj.tamanho * 1.02) + 2;
      const altGrupo = r(52) + r(18) + altTit + r(16) + altBaixo;
      let y = yTopo + Math.max(0, (espaco - altGrupo) / 2);
      y = pilula(xi, y, o.chamada, o.destaque) + r(18);
      const c = cargo({ x: xi, y, l: li, a: altTit }, tinta, r(124), 'topo');
      y = c.y + c.altura + r(16);
      cabeca(xi, y, li, tinta, altEmp);
      y += altEmp + 14;
      const icones = { cor: tinta, fundoIcone: o.fundo, corIcone: ink(o.fundo) };
      y = linha(xi, y, li, 'pin', d.cidade, icones);
      linha(xi, y, li, 'maleta', condicoes, icones);
      // Canhoto
      const yc = yPic + 28;
      const lq = lado + PAD_QR * 2;
      const lSal = li - lq - 20;
      texto({ x: xi, y: yc, l: lSal, a: r(34) }, 'Salário', { max: r(26), peso: 500, cor: tinta, centrarV: true });
      texto({ x: xi, y: yc + r(34), l: lSal, a: r(110) - r(34) - 6 }, d.salario, { max: r(60), min: 28, peso: 700, justo: true, cor: tinta, alturaLinha: 1.05, centrarV: true });
      const n = quantos((m) => y1 - 24 - (yc + r(110) + m * ALT_DEST + ALT_MARCA), 0);
      const yd = destaquesLista(xi, yc + r(110), lSal, tinta, Math.min(n, 2));
      marca(xi, yd + 4, lSal, tinta);
      el.push({ tipo: 'qr', x: xi + li - lado, y: yc, l: lado, a: lado });
      texto({ x: xi + li - lado, y: yc + lado + 8, l: lado, a: r(62) }, d.cta, { max: r(25), peso: 700, cor: tinta, alturaLinha: 1.12 });
      texto({ x: xi + li - lado, y: yc + lado + 8 + r(62), l: lado, a: 30 }, d.link.replace(/^https?:\/\//, ''), { max: 24, peso: 400, cor: tinta, centrarV: true });
      return fim();
    }

    case 'bolhas': {
      // Bolhas de cor nos cantos e o conteúdo solto, como um post de marca jovem.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: o.fundo });
      el.push({ tipo: 'circulo', x: W * 0.9, y: H - W * 0.08, raio: W * 0.4, cor: o.destaque });
      el.push({ tipo: 'circulo', x: W * 1.02, y: TOPO + r(10), raio: W * 0.2, cor: o.texto, alfa: 0.07 });
      el.push({ tipo: 'circulo', x: W * 0.7, y: TOPO + r(36), raio: r(16), cor: o.destaque });
      const tinta = ink(o.fundo);
      const y = cabeca(X, TOPO, L * 0.8, tinta) + r(30) + r(52);
      const yQr = FIM - ALT_QR;
      const larg = L - LARG_QR - 32;
      const icones = { cor: tinta, fundoIcone: '#FFFFFF', corIcone: ink('#FFFFFF') };
      const n = quantos((m) => yQr - 24 - y - (ALT_LINHA * 3 + 12 + m * ALT_DEST + ALT_MARCA) - r(180), 0);
      const altInfo = ALT_LINHA * 3 + (n ? 12 + n * ALT_DEST : 0) + ALT_MARCA;
      const yInfo = FIM - altInfo;
      const cb = cargo({ x: X, y, l: L, a: Math.min(yQr - 24, yInfo - 24) - y }, tinta, r(130), 'base');
      pilula(X, cb.y - r(52) - 14, o.chamada, '#FFFFFF');
      let yy = linhasPadrao(X, yInfo, larg, icones);
      if (n) yy = destaquesLista(X, yy + 12, larg, tinta, n);
      marca(X, yy, larg, tinta);
      qr(X + L - LARG_QR, yQr, true);
      return fim();
    }

    case 'lista': {
      // Ficha: cargo em cima e cada informação numa linha, com rótulo e valor.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: '#FFFFFF' });
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: r(16), cor: o.destaque });
      const tinta = ink('#FFFFFF');
      let y = cabeca(X, TOPO + 8, L, tinta) + r(26);
      texto({ x: X, y, l: L, a: r(44) }, o.chamada, { max: r(31), peso: 600, cor: ink('#FFFFFF', o.destaque), centrarV: true });
      y += r(44) + 6;
      const ALT_FICHA = r(66);
      const larg = L - LARG_QR - 32;
      const yQr = FIM - ALT_QR;
      const n = quantos((m) => FIM - (y + r(170) + ALT_FICHA * 3 + 16 + m * ALT_DEST + ALT_MARCA), 0);
      const altInfo = Math.max(ALT_FICHA * 3 + (n ? 16 + n * ALT_DEST : 0) + ALT_MARCA, ALT_QR);
      const yInfoMin = FIM - altInfo;
      const aj = ajustarTexto(d.titulo, { largura: L, altura: yInfoMin - 28 - y, max: r(156), min: 40, alturaLinha: 1.02, peso, justo: true }, medir);
      const altTit = Math.ceil(aj.linhas.length * aj.tamanho * 1.02) + 2;
      const sobra = Math.max(0, yInfoMin - 28 - y - altTit);
      cargo({ x: X, y: y + sobra * 0.35, l: L, a: altTit }, tinta, r(156), 'topo');
      const yInfo = y + sobra * 0.35 + altTit + 28 + sobra * 0.3;
      let yy = yInfo;
      for (const [rotulo, valor, forte] of [['Salário', d.salario, true], ['Contrato', condicoes, false], ['Local', d.cidade, false]] as const) {
        el.push({ tipo: 'ret', x: X, y: yy, l: larg, a: 2, cor: CLARO });
        const lr = r(150);
        texto({ x: X, y: yy + 2, l: lr, a: ALT_FICHA - 2 }, rotulo, { max: r(25), peso: 500, cor: tinta, centrarV: true });
        texto({ x: X + lr, y: yy + 2, l: larg - lr, a: ALT_FICHA - 2 }, valor, { max: forte ? r(34) : r(29), peso: forte ? 700 : 500, cor: tinta, centrarV: true });
        yy += ALT_FICHA;
      }
      if (n) yy = destaquesLista(X, yy + 16, larg, tinta, n);
      marca(X, yy, larg, tinta);
      qr(X + L - LARG_QR, Math.min(yQr, yInfo), true, CLARO);
      return fim();
    }

    case 'tipografica': {
      // O cargo enorme, linha a linha em duas cores; o resto em uma faixa discreta.
      const fundo = o.texto;
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: fundo });
      const c1 = ink(fundo, o.fundo);
      const c2 = ink(fundo, o.destaque);
      let y = cabeca(X, TOPO, L, c1) + r(30);
      const yQr = FIM - ALT_QR;
      const larg = L - LARG_QR - 32;
      const altEtiq = r(50);
      const etiquetas = [d.salario, d.contrato, d.modalidade, d.cidade];
      // Etiquetas correm na linha e descem quando não cabem.
      const tam = r(27);
      const larguraDe = (t: string) => Math.min(larg, medir(t, tam, 600, false) + 40);
      const posicoes: { t: string; x: number; y: number; l: number }[] = [];
      let cx = 0;
      let fila = 0;
      for (const t of etiquetas) {
        const l = larguraDe(t);
        if (cx && cx + l > larg) {
          cx = 0;
          fila += 1;
        }
        posicoes.push({ t, x: cx, y: fila * (altEtiq + 10), l });
        cx += l + 10;
      }
      const altEtiqs = (fila + 1) * altEtiq + fila * 10;
      const yEtiq = FIM - altEtiqs - ALT_MARCA - (ALT_MARCA ? 8 : 0);
      cargo({ x: X, y, l: L, a: Math.min(yEtiq, yQr) - 32 - y }, c1, r(200), 'topo', [c1, c2]);
      posicoes.forEach((p, i) => {
        const fundoEtiq = i === 0 ? o.destaque : 'rgba(255,255,255,0.12)';
        el.push({ tipo: 'ret', x: X + p.x, y: yEtiq + p.y, l: p.l, a: altEtiq, cor: i === 0 ? o.destaque : ink(fundo) === '#FFFFFF' ? '#FFFFFF1F' : '#0000001A', raio: altEtiq / 2 });
        void fundoEtiq;
        texto({ x: X + p.x + 20, y: yEtiq + p.y, l: p.l - 40, a: altEtiq }, p.t, { max: tam, peso: 600, cor: i === 0 ? ink(o.destaque) : c1, centrarV: true });
      });
      marca(X, FIM - 30, larg, c1);
      qr(X + L - LARG_QR, yQr, true);
      return fim();
    }

    case 'foto': {
      // Foto em cima, com a chamada sobre ela; embaixo, cargo, dados e QR Code.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: o.fundo });
      const tinta = ink(o.fundo);
      const yFoto = stories ? 170 : 24;
      const yQr = FIM - ALT_QR;
      const larg = L - LARG_QR - 28;
      const altLinhas = ALT_LINHA * 3 + ALT_MARCA;
      const yBaixo = Math.min(yQr, FIM - altLinhas) - r(24);
      const maxTit = r(190);
      const aj = ajustarTexto(d.titulo, { largura: L, altura: maxTit, max: r(96), min: 40, alturaLinha: 1.02, peso, justo: true }, medir);
      const altTit = Math.ceil(aj.linhas.length * aj.tamanho * 1.02) + 2;
      const altNome = r(46);
      const yTit = yBaixo - altTit;
      const yNome = yTit - altNome - 6;
      const altFoto = yNome - 16 - yFoto;
      fundoImagem({ x: 24, y: yFoto, l: W - 48, a: altFoto }, 48);
      if (d.temLogo) placaLogo(48, yFoto + 24, r(84));
      pilula(48, yFoto + altFoto - 24 - r(52), o.chamada, '#FFFFFF', W - 96);
      texto({ x: X, y: yNome, l: L, a: altNome }, d.empresa, { max: r(32), peso: 600, cor: tinta, centrarV: true });
      cargo({ x: X, y: yTit, l: L, a: altTit }, tinta, r(96), 'topo');
      linhasPadrao(X, FIM - altLinhas, larg, { cor: tinta, fundoIcone: '#FFFFFF', corIcone: ink('#FFFFFF') });
      marca(X, FIM - 30, larg, tinta);
      qr(X + L - LARG_QR, yQr, true);
      return fim();
    }

    case 'fotointeira': {
      // A foto ocupa tudo; um degradê escuro embaixo segura o texto branco.
      fundoImagem({ x: 0, y: 0, l: W, a: H }, 0);
      el.push({ tipo: 'degrade', x: 0, y: Math.round(H * 0.28), l: W, a: H - Math.round(H * 0.28), de: 'rgba(10,12,16,0)', para: 'rgba(10,12,16,0.86)' });
      el.push({ tipo: 'ret', x: 0, y: H - Math.round(H * 0.22), l: W, a: Math.round(H * 0.22), cor: 'rgba(10,12,16,0.5)' });
      if (d.temLogo) placaLogo(48, stories ? 170 : 48, r(88));
      const branco = '#FFFFFF';
      const yQr = FIM - ALT_QR;
      const larg = L - LARG_QR - 28;
      const altLinhas = ALT_LINHA * 3 + ALT_MARCA;
      const yLinhas = FIM - altLinhas;
      const maxTit = r(stories ? 260 : 190);
      const aj = ajustarTexto(d.titulo, { largura: L, altura: maxTit, max: r(100), min: 40, alturaLinha: 1.02, peso, justo: true }, medir);
      const altTit = Math.ceil(aj.linhas.length * aj.tamanho * 1.02) + 2;
      const yTit = Math.min(yLinhas, yQr) - r(24) - altTit;
      cargo({ x: X, y: yTit, l: L, a: altTit }, branco, r(100), 'topo');
      const yNome = yTit - r(46) - 4;
      texto({ x: X, y: yNome, l: L * 0.7, a: r(46) }, d.empresa, { max: r(30), peso: 600, cor: branco, centrarV: true });
      pilula(X, yNome - r(52) - 12, o.chamada, o.destaque);
      linhasPadrao(X, yLinhas, larg, { cor: branco, fundoIcone: 'rgba(255,255,255,0.2)', corIcone: branco });
      marca(X, FIM - 30, larg, branco);
      qr(X + L - LARG_QR, yQr, true);
      return fim();
    }

    default: {
      // Cartão: fundo claro, cargo no meio e um cartão branco com tudo o que importa.
      el.push({ tipo: 'ret', x: 0, y: 0, l: W, a: H, cor: o.fundo });
      const tintaTopo = ink(o.fundo);
      const tinta = ink('#FFFFFF');
      const PAD = 32;
      const larg = L - LADO_QR - 28;
      const altSal = r(100);
      const icones = { cor: tinta, fundoIcone: CLARO, corIcone: ink(CLARO) };
      const altEsq = (m: number) => altSal + 14 + ALT_LINHA * 2 + (m ? 10 + m * ALT_DEST : 0) + ALT_MARCA;
      const altDir = LADO_QR + 8 + ALT_LEGENDA;
      const altPainel = (m: number) => Math.max(altEsq(m), altDir) + PAD * 2;
      const yCab = cabeca(X, TOPO, L, tintaTopo);
      const n = quantos((m) => FIM - altPainel(m) - 28 - (yCab + r(70)), r(180));
      const alt = altPainel(n);
      const yP = FIM - alt;
      el.push({ tipo: 'ret', x: X - PAD, y: yP, l: L + PAD * 2, a: alt, cor: '#FFFFFF', raio: 48 });
      el.splice(1, 0, { tipo: 'circulo', x: W * 0.96, y: TOPO + r(40), raio: W * 0.3, cor: o.destaque, alfa: 0.35 });
      const zona = { y: yCab + r(24), a: yP - 28 - (yCab + r(24)) };
      const aj = ajustarTexto(d.titulo, { largura: L, altura: zona.a - r(54), max: r(132), min: 40, alturaLinha: 1.02, peso, justo: true }, medir);
      const altTit = Math.ceil(aj.linhas.length * aj.tamanho * 1.02) + 2;
      const yGrupo = zona.y + Math.max(0, (zona.a - (r(54) + altTit)) * 0.6);
      texto({ x: X, y: yGrupo, l: L, a: r(48) }, o.chamada, { max: r(32), peso: 500, cor: tintaTopo, centrarV: true });
      cargo({ x: X, y: yGrupo + r(54), l: L, a: altTit }, tintaTopo, r(132), 'topo');
      let y = yP + PAD;
      el.push({ tipo: 'ret', x: X, y, l: larg, a: altSal, cor: o.destaque, raio: 28 });
      const tSal = ink(o.destaque);
      texto({ x: X + 24, y: y + r(10), l: larg - 48, a: r(32) }, 'Salário', { max: r(26), peso: 500, cor: tSal, centrarV: true });
      texto({ x: X + 24, y: y + r(10) + r(32), l: larg - 48, a: altSal - r(10) - r(32) - r(8) }, d.salario, { max: r(46), min: 26, peso: 700, justo: true, cor: tSal, alturaLinha: 1.05, centrarV: true });
      y += altSal + 14;
      y = linha(X, y, larg, 'pin', d.cidade, icones);
      y = linha(X, y, larg, 'maleta', condicoes, icones);
      if (n) y = destaquesLista(X, y + 10, larg, tinta, n);
      marca(X, y, larg, tinta);
      qr(X + L - LADO_QR - PAD_QR, yP + PAD - PAD_QR, false);
      return fim();
    }
  }
}
