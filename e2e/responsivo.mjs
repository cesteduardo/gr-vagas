// Auditoria do padrão GR Brands 1: fotos nas larguras pedidas e varredura de 320 a 1920.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrirNavegador, BASE } from './comum.mjs';

const SAIDA = process.env.SAIDA ?? 'e2e/saida';
mkdirSync(SAIDA, { recursive: true });
const b = await abrirNavegador();
const carimbo = Date.now();
const FOTOS = [1440, 1280, 1024, 768, 430, 390, 360];
const VARREDURA = [];
for (let w = 320; w <= 1920; w += 40) VARREDURA.push(w);
let problemas = 0;

const medir = (p) =>
  p.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const fora = [...document.querySelectorAll('body *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        if (e.closest('.so-leitor,.rapidas,.carrossel-trilho-apple,.segmentado-trilha,.roleta,.letreiro,.gaveta,.veu')) return false;
        return r.right > largura + 1 || r.left < -1;
      })
      .slice(0, 3)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(' ')[0]}`);
    const pequenos = [...document.querySelectorAll('main a.btn, main button, main .selecao-botao, main input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file])')]
      .filter((e) => {
        if (e.closest('.so-leitor') || e.classList.contains('so-leitor') || e.matches('.nota .link-legal')) return false; // link no meio do texto: exceção de alvo em linha
        const r = e.getBoundingClientRect();
        return r.width && r.height && r.height < 40;
      })
      .slice(0, 3)
      .map((e) => `${e.tagName.toLowerCase()}:${e.innerText?.slice(0, 20)}`);
    return { rolagem: document.documentElement.scrollWidth > largura, fora, pequenos };
  });

async function auditar(p, nome, caminho) {
  await p.goto(caminho);
  await p.waitForTimeout(400);
  for (const w of VARREDURA) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(30);
    const m = await medir(p);
    if (m.rolagem || m.fora.length || m.pequenos.length) {
      problemas += 1;
      console.log(`PROBLEMA ${nome} em ${w}px: rolagem=${m.rolagem} fora=${m.fora.join(', ')} pequenos=${m.pequenos.join(', ')}`);
    }
  }
  for (const w of FOTOS) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(250);
    await p.screenshot({ path: join(SAIDA, `${nome}-${w}.png`), fullPage: true });
  }
  await p.setViewportSize({ width: 1280, height: 900 });
}

await (await b.newContext({ baseURL: BASE })).request.post('/api/demo/semear');

const ctx = await b.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
const rh = await ctx.newPage();
await rh.goto('/criar-conta?tipo=contratante');
await rh.locator('input[name=empresa]').fill('Empresa de nome bem comprido para testar quebra de linha Ltda');
await rh.locator('input[name=nome]').fill('Ana Souza');
await rh.locator('input[name=email]').fill(`resp${carimbo}@teste.com.br`);
await rh.locator('input[name=telefone]').fill('17999999999');
await rh.locator('input[name=senha]').fill('senhaforte123');
await rh.getByRole('button', { name: 'Criar conta da empresa' }).click();
await rh.waitForURL('**/painel**');
await rh.goto(`/publicar?titulo=${encodeURIComponent('Técnico em manutenção de equipamentos hospitalares e laboratoriais')}`);
await rh.locator('select[name=area]').selectOption('Saúde');
await rh.locator('textarea[name=descricao]').fill(`Texto longo ${'semespacosemespacosemespaco'.repeat(6)} com palavra enorme e fim da descrição.`);
await rh.locator('textarea[name=requisitos]').fill('Curso técnico');
await rh.locator('textarea[name=beneficios]').fill('Vale-transporte');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForURL('**/painel/vagas/**');
const painel = new URL(rh.url()).pathname;
const slug = (await rh.locator('#link-vaga').inputValue()).split('/').pop();

const cctx = await b.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
const c = await cctx.newPage();
await c.goto(`/vagas/${slug}`);
await c.locator('input[name=nome]').fill('Maria Aparecida de Oliveira Santos Ferreira');
await c.locator('input[name=telefone]').fill('17988887777');
await c.locator('input[name=email]').fill(`cand${carimbo}@um-dominio-bem-comprido-para-testar.com.br`);
await c.locator('input[name=senha]').fill('senhaforte123');
await c.getByRole('button', { name: 'Criar conta e candidatar-me' }).click();
await c.waitForURL('**/conversas/**');
const conversa = new URL(c.url()).pathname;
await c.locator('#mensagem').fill(`Mensagem ${'semespaco'.repeat(30)} e fim`);
await c.getByRole('button', { name: 'Enviar', exact: true }).click();
await c.waitForSelector('.msg-minha');

const anon = await (await b.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } })).newPage();
for (const [n, u] of [['inicio', '/'], ['vagas', '/vagas'], ['cidade', '/vagas/em/mirassol'], ['vaga', `/vagas/${slug}`], ['anunciantes', '/anunciantes'], ['almoco', '/calculos/volta-do-almoco'], ['extras', '/calculos/horas-extras'], ['criar-conta', '/criar-conta'], ['planos', '/planos'], ['publicar', '/publicar'], ['entrar', '/entrar'], ['termos', '/termos'], ['nao-existe', '/nao-existe']]) await auditar(anon, n, u);
for (const [n, u] of [['painel', '/painel'], ['painel-vaga', painel], ['painel-arte', `${painel}?aba=arte`], ['painel-editar', `${painel}?aba=editar`], ['painel-plano', '/painel/plano'], ['painel-empresa', '/painel/empresa'], ['painel-conta', '/painel/conta'], ['painel-talentos', '/painel/talentos'], ['conversa-rh', conversa]]) await auditar(rh, n, u);
for (const [n, u] of [['candidato', '/candidato'], ['candidato-perfil', '/candidato/perfil'], ['candidato-curriculo', '/candidato/curriculo'], ['candidato-alertas', '/candidato/alertas'], ['candidato-plano', '/candidato/plano'], ['conversa-cand', conversa]]) await auditar(c, n, u);

// Menu do celular e ilha ao rolar.
const m = await (await b.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
await m.goto('/');
await m.getByRole('button', { name: 'Abrir menu' }).click();
await m.waitForSelector('.menu-aberto .gaveta');
await m.waitForTimeout(500);
await m.screenshot({ path: join(SAIDA, 'menu-390.png') });
await m.getByRole('button', { name: 'Fechar menu' }).click();
await m.evaluate(() => window.scrollTo(0, 800));
await m.waitForTimeout(400);
await m.screenshot({ path: join(SAIDA, 'ilha-390.png') });
const d = await (await b.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
await d.goto('/');
for (const w of [1440, 768, 390, 768, 1440]) {
  await d.setViewportSize({ width: w, height: 900 });
  await d.waitForTimeout(300);
  const r = await medir(d);
  if (r.rolagem || r.fora.length) { problemas += 1; console.log(`PROBLEMA rodada final ${w}`); }
}
await b.close();
console.log(problemas ? `${problemas} problemas.` : 'Sem transbordo nem alvo pequeno de 320 a 1920.');
process.exit(problemas ? 1 : 0);
