import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

export const BASE = process.env.BASE ?? 'http://localhost:4820';
export async function abrirNavegador() {
  const cache = join(homedir(), '.cache/ms-playwright');
  const pasta = readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().at(-1);
  return chromium.launch({ executablePath: join(cache, pasta, 'chrome-linux64/chrome') });
}

// PDF de verdade, com texto, para testar a leitura do currículo.
export function pdfComTexto(linhas) {
  const esc = (t) => t.replace(/[\\()]/g, '\\$&');
  const conteudo = `BT /F1 12 Tf 72 760 Td 16 TL ${linhas.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let corpo = '%PDF-1.4\n';
  const posicoes = [];
  objetos.forEach((o, i) => {
    posicoes.push(Buffer.byteLength(corpo, 'latin1'));
    corpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(corpo, 'latin1');
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posicoes.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corpo, 'latin1');
}

// Escolhe a hora na roleta do seletor (n = qual seletor da página).
export async function escolherHora(p, n, hora) {
  const [h, m] = hora.split(':');
  await p.locator('.hora-botao').nth(n).click();
  await p.getByRole('listbox', { name: 'Horas' }).getByRole('option', { name: h, exact: true }).click();
  await p.getByRole('listbox', { name: 'Minutos' }).getByRole('option', { name: m, exact: true }).click();
  await p.waitForFunction(([i, v]) => document.querySelectorAll('.hora-botao')[i]?.getAttribute('data-hora') === v, [n, hora]);
  await p.getByRole('button', { name: 'Pronto' }).click();
}
