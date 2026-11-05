import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { cidadePorSlug } from '@/lib/config';
import { periodo, type Cv } from '@/lib/curriculo';
import { formatarTelefone } from '@/lib/forms/validators';

// O PDF sai do servidor, pronto para baixar: nada de imprimir pelo navegador,
// que põe data, hora, título e endereço da página no cabeçalho e no rodapé.
// O molde é o currículo clássico do Eduardo: Times, nome centralizado em
// maiúsculas, seções numeradas em negrito sublinhado e "ano - curso - instituição".

export type DadosCurriculoPdf = { nome: string; email: string; telefone: string; titulo: string; cidadeSlug: string; resumo: string; cv: Cv };

const PASTA_FONTES = join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules/@fontsource/tinos/files');
let fontes: { normal: Buffer; negrito: Buffer } | null = null;
const carregarFontes = () => (fontes ??= {
  normal: readFileSync(join(PASTA_FONTES, 'tinos-latin-400-normal.woff')),
  negrito: readFileSync(join(PASTA_FONTES, 'tinos-latin-700-normal.woff')),
});

const MARGEM = { top: 72, bottom: 64, left: 57, right: 50 };
const CORPO = 11.5;
const ENTRELINHA = 2.2;
const TINTA = '#111111';
const CINZA = '#8a909a';

const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');
// Só o que a fonte desenha: o Tinos embutido cobre o latim do português.
const limpo = (t: string | undefined) => (t ?? '').replace(/[–—]/g, '-').replace(/[^\u0009\u000a -~ -ÿ‘-”•…]/g, '').trim();

// Símbolo da GR Vagas, o mesmo SVG do site (viewBox 5 0 100 100, girado -22°).
function simbolo(doc: PDFKit.PDFDocument, x: number, y: number, tamanho: number) {
  doc.save();
  doc.translate(x, y).scale(tamanho / 100).translate(-5, 0).rotate(-22, { origin: [55, 50] });
  doc.path('M22.12 47A38 38 0 0 1 97.88 47Z').fill('#286FEC');
  doc.path('M12.12 53A38 38 0 0 0 87.88 53Z').fill('#A8C8FA');
  doc.restore();
}

export function gerarCurriculoPdf(d: DadosCurriculoPdf): Promise<Buffer> {
  const f = carregarFontes();
  const doc = new PDFDocument({ size: 'A4', margins: MARGEM, info: { Title: `Currículo - ${limpo(d.nome)}`, Author: limpo(d.nome), Creator: 'GR Vagas', Producer: 'GR Vagas' } });
  doc.registerFont('normal', f.normal);
  doc.registerFont('negrito', f.negrito);
  const partes: Buffer[] = [];
  doc.on('data', (b: Buffer) => partes.push(b));
  const pronto = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(partes))));

  const largura = doc.page.width - MARGEM.left - MARGEM.right;
  const fundo = () => doc.page.height - MARGEM.bottom;
  // Não deixa um título ou a primeira linha de um item sozinhos no pé da página.
  const caber = (altura: number) => { if (doc.y + altura > fundo()) doc.addPage(); };
  const paragrafo = (t: string, depois = 0) => {
    doc.font('normal').fontSize(CORPO).fillColor(TINTA).text(t, MARGEM.left, doc.y, { width: largura, lineGap: ENTRELINHA });
    if (depois) doc.moveDown(depois);
  };

  let n = 0;
  const secao = (titulo: string) => {
    caber(60);
    n += 1;
    doc.moveDown(n === 1 ? 0 : 0.9);
    doc.font('negrito').fontSize(CORPO).fillColor(TINTA).text(`${n}.${titulo}`, MARGEM.left, doc.y, { underline: true, lineGap: ENTRELINHA });
    doc.moveDown(0.75);
  };

  // Nome
  doc.font('normal').fontSize(25).fillColor(TINTA).text(limpo(d.nome).toLocaleUpperCase('pt-BR'), MARGEM.left, MARGEM.top, { width: largura, align: 'center' });
  doc.moveDown(1.1);

  const cv = d.cv;
  const cidade = cidadePorSlug(d.cidadeSlug);
  const pessoais = [
    ['Estado Civil', cv.estadoCivil],
    ['Nascimento', dataBr(cv.nascimento)],
    ['Endereço', cv.endereco],
  ].filter(([, v]) => v);
  secao('Dados pessoais');
  for (const [r, v] of pessoais) paragrafo(`${r}: ${limpo(v)}`);
  if (cidade) paragrafo(`${cidade.nome} - ${cidade.uf}`);
  if (d.telefone) paragrafo(`Telefone: ${formatarTelefone(d.telefone)}`);
  paragrafo(`E-mail: ${limpo(d.email)}`);
  if (cv.portfolio) paragrafo(`Portfólio: ${limpo(cv.portfolio).replace(/^https?:\/\//i, '')}`);

  const objetivo = limpo(cv.objetivo) || limpo(d.titulo);
  if (objetivo) { secao('Objetivo'); paragrafo(objetivo); }
  if (limpo(d.resumo)) { secao('Resumo profissional'); paragrafo(limpo(d.resumo)); }

  if (cv.idiomas?.length) {
    secao('Idiomas');
    for (const i of cv.idiomas) paragrafo(`${limpo(i.lingua)} ${i.nivel.toLowerCase()}`);
  }

  if (cv.formacao?.length) {
    secao('Formação Acadêmica');
    cv.formacao.forEach((x, i) => {
      caber(30);
      paragrafo([periodo(x.inicio, x.fim), limpo(x.curso), limpo(x.instituicao)].filter(Boolean).join(' - '));
      if (limpo(x.descricao)) paragrafo(limpo(x.descricao));
      if (i < cv.formacao!.length - 1) doc.moveDown(0.7);
    });
  }

  if (cv.experiencias?.length) {
    secao('Experiência Profissional');
    cv.experiencias.forEach((x, i) => {
      caber(48);
      paragrafo([periodo(x.inicio, x.fim, x.atual), `${limpo(x.cargo)}${x.empresa ? ` em ${limpo(x.empresa)}` : ''}`].filter(Boolean).join(' - '));
      if (limpo(x.descricao)) { doc.moveDown(0.7); paragrafo(limpo(x.descricao)); }
      if (i < cv.experiencias!.length - 1) doc.moveDown(1.1);
    });
  }

  if (cv.habilidades?.length) {
    secao('Habilidades');
    paragrafo(`${cv.habilidades.map(limpo).filter(Boolean).join(', ')}.`);
  }

  // Marca d'água no fim, no pé da última página: símbolo, GR Vagas e o endereço.
  // A margem de baixo zera só aqui, senão o pdfkit abriria outra página para o rodapé.
  const linha = fundo() + 26;
  doc.page.margins.bottom = 0;
  doc.font('negrito').fontSize(8.5);
  const marca = 'GR Vagas';
  const resto = '  |  grbrands.com.br/vagas';
  const wMarca = doc.widthOfString(marca);
  doc.font('normal');
  const wResto = doc.widthOfString(resto);
  const icone = 10;
  const total = icone + 5 + wMarca + wResto;
  const x0 = MARGEM.left + (largura - total) / 2;
  simbolo(doc, x0, linha - 1.5, icone);
  doc.font('negrito').fillColor(CINZA).text(marca, x0 + icone + 5, linha, { lineBreak: false });
  doc.font('normal').fillColor(CINZA).text(resto, x0 + icone + 5 + wMarca, linha, { lineBreak: false, width: wResto + 4, height: 12 });
  doc.link(x0, linha - 2, total, 14, 'https://grbrands.com.br/vagas');

  doc.end();
  return pronto;
}
