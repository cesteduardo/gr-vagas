// Varre as páginas em três larguras e acusa botão cujo texto não cabe ou que vaza do cartão.
import { abrirNavegador, BASE } from './comum.mjs';

const PUBLICAS = ['/', '/vagas', '/anunciantes', '/planos', '/calculos', '/calculos/horas-extras', '/calculos/volta-do-almoco', '/entrar', '/criar-conta', '/termos', '/privacidade'];
const EMPRESA = ['/painel', '/painel/conta', '/painel/empresa', '/painel/plano', '/painel/talentos', '/publicar'];
const CANDIDATO = ['/candidato', '/candidato/alertas', '/candidato/conta', '/candidato/curriculo', '/candidato/perfil', '/candidato/plano', '/candidato/salvas'];
const LARGURAS = [390, 768, 1440];

const medir = () => [...document.querySelectorAll('.btn, button, a[class*="btn"]')].flatMap((b) => {
  const r = b.getBoundingClientRect();
  if (!r.width || getComputedStyle(b).visibility === 'hidden') return [];
  const nome = (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const prob = [];
  if (b.scrollWidth > b.clientWidth + 1) prob.push(`texto não cabe (${b.scrollWidth}>${b.clientWidth})`);
  if (r.right > innerWidth + 1 || r.left < -1) prob.push('sai da tela');
  const pai = b.closest('article, .painel-caixa, .plano, li, .cartao, section');
  if (pai) { const p = pai.getBoundingClientRect(); if (r.right > p.right + 1 || r.left < p.left - 1) prob.push('vaza do cartão'); }
  return prob.length ? [`${nome}: ${prob.join(', ')}`] : [];
});

async function entrar(ctx, email) {
  const p = await ctx.newPage();
  await p.goto(BASE + '/entrar');
  await p.locator('form.form-entrar input[type=email]').fill(email);
  await p.locator('input[name=senha][type=password]').fill('teste1234');
  await p.getByRole('button', { name: 'Entrar', exact: true }).last().click();
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 15000 });
  await p.close();
}

const b = await abrirNavegador();
let total = 0;
for (const [quem, rotas, email] of [['sem conta', PUBLICAS], ['empresa', EMPRESA, 'empresa@teste.com'], ['candidato', CANDIDATO, 'candidato@teste.com']]) {
  const ctx = await b.newContext();
  if (email) await entrar(ctx, email);
  const p = await ctx.newPage();
  for (const w of LARGURAS) {
    await p.setViewportSize({ width: w, height: 900 });
    for (const r of rotas) {
      await p.goto(BASE + r, { waitUntil: 'networkidle' });
      await p.waitForTimeout(300);
      const achados = [...new Set(await p.evaluate(medir))];
      for (const a of achados) console.log(`[${quem}] ${w}px ${r} → ${a}`);
      total += achados.length;
    }
  }
  await ctx.close();
}
await b.close();
console.log(total ? `${total} problema(s).` : 'Nenhum botão com problema.');
process.exitCode = total ? 1 : 0;
