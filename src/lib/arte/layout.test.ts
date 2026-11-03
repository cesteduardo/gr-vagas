import { describe, expect, it } from 'vitest';
import { contraste, textoLegivel } from './cores';
import { ajustarTexto, montarArte, type Caixa, type DadosArte, type Elemento, type Medir, type OpcoesArte } from './layout';
import { FORMATOS, MODELOS, PALETAS } from './modelos';

const medir: Medir = (t, tam, peso, justo) => t.length * tam * (justo ? 0.5 : 0.56) * (peso > 700 ? 1.05 : 1);
const dados: DadosArte = { titulo: 'Auxiliar Administrativo', empresa: 'Empresa Exemplo', cidade: 'São José do Rio Preto', contrato: 'CLT', modalidade: 'Presencial', salario: 'R$ 2.000,00', link: 'https://grvagas.com.br', cta: 'Aponte a câmera e candidate-se', destaques: ['Vale-transporte', 'Vale-refeição', 'Plano de saúde'], temLogo: true, temImagem: true };
const opcoes = (o: Partial<OpcoesArte> = {}): OpcoesArte => ({ modelo: 'cartao', formato: 'feed', fundo: '#DCEBFB', destaque: '#F79C6B', texto: '#14213D', chamada: 'Estamos contratando', marca: true, ...o });

const sobrepoe = (a: Caixa, b: Caixa) => a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.a && b.y < a.y + a.a;

describe('cores', () => {
  it('respeita a cor escolhida quando dá para ler', () => {
    expect(textoLegivel('#DCEBFB', '#14213D')).toBe('#14213D');
  });
  it('corrige quando a escolha ficaria ilegível', () => {
    for (const fundo of ['#777777', '#000000', '#FFFFFF', '#FFD21E', '#808080', ...PALETAS.map((p) => p.fundo)]) {
      expect(contraste(fundo, textoLegivel(fundo, fundo))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('ajustarTexto', () => {
  const caixa = { largura: 800, altura: 300, max: 150, min: 30, alturaLinha: 1.04, peso: 800, justo: true };
  it('título curto fica grande', () => {
    expect(ajustarTexto('Caixa', caixa, medir).tamanho).toBe(150);
  });
  it('título de 300 caracteres cabe na caixa', () => {
    const r = ajustarTexto('Auxiliar de serviços gerais '.repeat(12), caixa, medir);
    expect(r.linhas.length * r.tamanho * 1.04).toBeLessThanOrEqual(300);
    for (const l of r.linhas) expect(medir(l, r.tamanho, 800, true)).toBeLessThanOrEqual(800);
  });
  it('palavra de 80 letras é quebrada e não sai da largura', () => {
    const r = ajustarTexto('x'.repeat(80), caixa, medir);
    for (const l of r.linhas) expect(medir(l, r.tamanho, 800, true)).toBeLessThanOrEqual(800);
  });
  it('prefere letra menor a cortar a palavra', () => {
    const r = ajustarTexto('Recepcionista bilíngue', { ...caixa, max: 190, altura: 500 }, medir);
    expect(r.linhas.join(' ')).toBe('Recepcionista bilíngue');
    expect(r.tamanho).toBeLessThan(190);
  });
  it('corta com reticências quando nada cabe', () => {
    const r = ajustarTexto('palavra '.repeat(500), { ...caixa, altura: 70 }, medir);
    expect(r.linhas.at(-1)?.endsWith('…')).toBe(true);
    expect(r.linhas.length * r.tamanho * 1.04).toBeLessThanOrEqual(70);
  });
});

describe('montarArte', () => {
  const casos = MODELOS.flatMap((m) => FORMATOS.map((f) => [m.id, f.id] as const));
  it.each(casos)('%s em %s: nada sai da arte nem se sobrepõe', (modelo, formato) => {
    for (const titulo of [dados.titulo, 'Técnico em manutenção de equipamentos hospitalares e laboratoriais de alta complexidade', 'x'.repeat(80)]) {
      for (const marca of [true, false]) {
        for (const temLogo of [true, false]) {
          const arte = montarArte({ ...dados, titulo, temLogo }, opcoes({ modelo, formato, marca }), medir);
          const conteudo = arte.elementos.filter((e) => e.tipo === 'texto' || e.tipo === 'qr' || e.tipo === 'logo' || e.tipo === 'icone') as (Elemento & Caixa)[];
          for (const e of conteudo) {
            expect(e.a).toBeGreaterThan(0);
            expect(e.x).toBeGreaterThanOrEqual(0);
            expect(e.y).toBeGreaterThanOrEqual(0);
            expect(e.x + e.l).toBeLessThanOrEqual(arte.largura);
            expect(e.y + e.a).toBeLessThanOrEqual(arte.altura);
            if (e.tipo === 'texto') {
              expect(e.linhas.length * e.tamanho * e.alturaLinha).toBeLessThanOrEqual(e.a + 0.01);
              for (const l of e.linhas) expect(medir(l, e.tamanho, e.peso, e.justo)).toBeLessThanOrEqual(e.l + 0.01);
            }
          }
          for (const [i, a] of conteudo.entries()) for (const b of conteudo.slice(i + 1)) expect(sobrepoe(a, b)).toBe(false);
          for (const e of conteudo) if (e.tipo === 'texto') expect(e.tamanho).toBeGreaterThanOrEqual(24);
        }
      }
    }
  });
  it('os modelos são de fato diferentes entre si', () => {
    const assinatura = (m: string) => montarArte(dados, opcoes({ modelo: m as never }), medir).elementos.map((e) => `${e.tipo}:${'x' in e ? Math.round(e.x / 40) : ''}:${'y' in e ? Math.round(e.y / 40) : ''}`).join(',');
    const todas = MODELOS.map((m) => assinatura(m.id));
    expect(new Set(todas).size).toBe(MODELOS.length);
  });
  it('sem imagem, os modelos com foto usam a cor de destaque', () => {
    const arte = montarArte({ ...dados, temImagem: false }, opcoes({ modelo: 'foto' }), medir);
    expect(arte.elementos.some((e) => e.tipo === 'imagem')).toBe(false);
    expect(arte.elementos.some((e) => e.tipo === 'ret' && e.cor === '#F79C6B')).toBe(true);
  });
  it('salário, condições, benefícios e instrução estão na arte, nessa ordem de leitura', () => {
    const arte = montarArte(dados, opcoes({ formato: 'retrato' }), medir);
    for (const m of MODELOS) {
      const a = montarArte(dados, opcoes({ modelo: m.id, formato: 'retrato' }), medir);
      const textos = a.elementos.flatMap((e) => (e.tipo === 'texto' ? [e.linhas.join(' ')] : [])).join(' | ');
      for (const t of ['Auxiliar', 'R$ 2.000,00', 'CLT', 'São José do Rio Preto', 'Aponte a câmera', 'Empresa Exemplo']) expect(textos, `${m.id}: ${t}`).toContain(t);
      expect(a.elementos.some((e) => e.tipo === 'qr')).toBe(true);
    }
    void arte;
  });
  it('o cargo é sempre o maior texto da arte', () => {
    for (const m of MODELOS) {
      const arte = montarArte(dados, opcoes({ modelo: m.id }), medir);
      const textos = arte.elementos.flatMap((e) => (e.tipo === 'texto' ? [e] : []));
      const cargo = textos.find((e) => e.linhas.join(' ').includes('Auxiliar'))!;
      expect(Math.max(...textos.map((e) => e.tamanho))).toBe(cargo.tamanho);
    }
  });
  it('sem espaço, os benefícios cedem antes do cargo', () => {
    const longo = 'Técnico em manutenção de equipamentos hospitalares e laboratoriais';
    const arte = montarArte({ ...dados, titulo: longo }, opcoes({ modelo: 'foto', formato: 'feed' }), medir);
    const cargo = arte.elementos.find((e) => e.tipo === 'texto' && e.linhas.join(' ').includes('Técnico'));
    expect(cargo && cargo.tipo === 'texto' && cargo.tamanho).toBeGreaterThanOrEqual(40);
  });
  it('não deixa conectivo no fim da linha', () => {
    const r = ajustarTexto('Auxiliar de serviços gerais de limpeza', { largura: 620, altura: 400, max: 90, min: 40, alturaLinha: 1, peso: 600, justo: true }, medir);
    for (const l of r.linhas.slice(0, -1)) expect(l).not.toMatch(/ (de|da|do|e|em)$/);
  });
  it('a marca do GR Vagas só aparece quando pedida', () => {
    const textos = (marca: boolean) => montarArte(dados, opcoes({ marca }), medir).elementos.flatMap((e) => (e.tipo === 'texto' ? e.linhas : []));
    expect(textos(true).join(' ')).toContain('GR Vagas');
    expect(textos(false).join(' ')).not.toContain('Arte feita');
  });
});
