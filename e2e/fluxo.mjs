// Percorre o produto como as pessoas usam, clicando de verdade.
// Uso: BASE=http://localhost:4820 ADMIN=admin@teste.com.br node e2e/fluxo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { abrirNavegador, BASE, escolherHora, pdfComTexto } from './comum.mjs';

const SAIDA = process.env.SAIDA ?? 'e2e/saida';
mkdirSync(SAIDA, { recursive: true });
const b = await abrirNavegador();
let falhas = 0;
const ok = (cond, nome, extra = '') => {
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${nome}${extra ? ` (${extra})` : ''}`);
  if (!cond) falhas += 1;
};
const carimbo = Date.now();
const novo = async (w = 1280, h = 900) => {
  const ctx = await b.newContext({ baseURL: BASE, viewport: { width: w, height: h }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => ok(false, 'erro de JS', e.message));
  return p;
};
const lerQr = async (p) => {
  await p.addScriptTag({ path: resolve('node_modules/jsqr/dist/jsQR.js') }).catch(() => {});
  await p.waitForTimeout(250);
  return p.evaluate(() => {
    const c = document.querySelector('canvas[data-arte]');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return window.jsQR(d.data, d.width, d.height)?.data ?? null;
  });
};
const criarEmpresa = async (p, email, empresa) => {
  await p.goto('/criar-conta?tipo=contratante');
  await p.locator('input[name=empresa]').fill(empresa);
  await p.locator('input[name=nome]').fill('Pessoa Empresa');
  await p.locator('input[name=email]').fill(email);
  await p.locator('input[name=telefone]').fill('17977776666');
  await p.locator('input[name=senha]').fill('senhaforte123');
  await p.getByRole('button', { name: 'Criar conta da empresa' }).click();
  await p.waitForURL('**/painel**');
};
const aba = async (p, nome) => {
  const mapa = { Texto: 'Texto e fonte', 'Foto e logo': 'Foto e logo', 'QR Code': 'QR Code', 'Cores próprias': 'Cores próprias' };
  if (!mapa[nome]) return;
  const d = p.locator(`details[data-ajuste="${mapa[nome]}"]`);
  if ((await d.getAttribute('open')) === null) await d.locator('summary').click();
};
const preencherVaga = async (p, titulo) => {
  await p.locator('input[name=titulo]').fill(titulo);
  await p.locator('select[name=area]').selectOption('Administrativo');
  await p.locator('textarea[name=descricao]').fill('Atender clientes, organizar documentos e apoiar a rotina do escritório.');
  await p.locator('textarea[name=requisitos]').fill('Ensino médio completo');
  await p.locator('textarea[name=beneficios]').fill('Vale-transporte e vale-refeição');
};

// 1. Conta da empresa, com o padrão de formulários no cadastro.
const rh = await novo();
await rh.goto('/publicar');
ok((await rh.getByRole('link', { name: 'Criar conta da empresa' }).count()) === 1, 'sem conta não publica: pede para criar a conta');
await rh.goto('/criar-conta?tipo=contratante');
await rh.getByRole('button', { name: 'Criar conta da empresa' }).click();
await rh.waitForTimeout(150);
ok((await rh.locator('.erro').count()) >= 4, 'cadastro vazio é barrado com mensagens', `${await rh.locator('.erro').count()} erros`);
const nome = rh.locator('input[name=nome]');
await nome.pressSequentially('Eduardo123 Gonçalves');
ok((await nome.inputValue()) === 'Eduardo Gonçalves', 'nome não aceita números ao digitar');
const fone = rh.locator('input[name=telefone]');
const colar = async (texto) => {
  await fone.fill('');
  await fone.focus();
  await rh.evaluate((t) => navigator.clipboard.writeText(t), texto);
  await rh.keyboard.press('Control+V');
  return fone.inputValue();
};
ok((await colar('+55 17 99999-9999')) === '(17) 99999-9999', 'colar +55 remove o país');
ok((await colar('5517999999999')) === '(17) 99999-9999', 'colar 55+DDD remove o país');
ok((await colar('55999999999')) === '(55) 99999-9999', 'DDD 55 é preservado');
ok((await colar('abc17999999999')) === '(17) 99999-9999', 'colar com letras limpa');
const emailRh = `rh${carimbo}@teste.com.br`;
await rh.locator('input[name=empresa]').fill('Padaria Teste');
await rh.locator('input[name=email]').fill(emailRh);
await rh.locator('input[name=senha]').fill('senhaforte123');
await rh.getByRole('button', { name: 'Criar conta da empresa' }).click();
await rh.waitForURL('**/painel**');
ok(true, 'conta da empresa criada e já dentro do painel');

// 2. A arte do hero responde e o cargo chega à publicação.
await rh.goto('/anunciantes');
const antes = await rh.locator('canvas[data-arte]').first().evaluate((c) => c.toDataURL());
await rh.getByPlaceholder('Qual é o cargo?').fill('Recepcionista bilíngue');
await rh.waitForTimeout(300);
ok((await rh.locator('canvas[data-arte]').first().evaluate((c) => c.toDataURL())) !== antes, 'arte do hero muda ao digitar');
await rh.getByRole('link', { name: 'Publicar esta vaga' }).click();
await rh.waitForURL('**/publicar**');
ok((await rh.locator('input[name=titulo]').inputValue()) === 'Recepcionista bilíngue', 'cargo chega preenchido em publicar');
await rh.locator('input[name=titulo]').fill('');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForTimeout(150);
ok((await rh.locator('.erro').count()) >= 4, 'vaga vazia é barrada com mensagens');
ok((await rh.evaluate(() => document.activeElement?.getAttribute('name'))) === 'titulo', 'foco vai para o primeiro erro');
await preencherVaga(rh, 'Recepcionista bilíngue');
await rh.locator('textarea[name=requisitos]').fill('Exigimos boa aparência');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForTimeout(150);
ok((await rh.locator('#erro-requisitos').innerText()).includes('aparência'), 'moderação barra discriminação');
await rh.locator('textarea[name=requisitos]').fill('Ensino médio completo');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForURL('**/painel/vagas/**aba=arte**');
ok(true, 'publicou com a conta da empresa');

// 3. Arte: QR Code legível, download e travas do plano grátis.
const urlPainel = rh.url().split('?')[0];
await rh.waitForTimeout(500);
const link = await rh.locator('#link-vaga').inputValue();
const slug = link.split('/').pop();
ok((await lerQr(rh)) === link, 'QR Code lê o link da vaga', link);
for (const f of ['Retrato', 'Stories']) {
  await rh.getByRole('button', { name: f, exact: true }).click();
  await rh.waitForTimeout(200);
  ok((await lerQr(rh)) === link, `QR Code no formato ${f}`);
}
const [down] = await Promise.all([rh.waitForEvent('download'), rh.getByRole('button', { name: 'Baixar arte em PNG' }).click()]);
ok(down.suggestedFilename().endsWith('stories.png'), 'baixa o PNG', down.suggestedFilename());
await down.saveAs(join(SAIDA, 'arte-baixada.png'));
ok((await rh.locator('.miniatura canvas').count()) === 9, 'galeria mostra os nove modelos com a própria vaga');
await rh.getByRole('button', { name: 'Tipográfica', exact: true }).click();
await rh.waitForTimeout(200);
ok((await lerQr(rh)) === link, 'personalização é livre no plano grátis');
await rh.getByRole('button', { name: 'Cartão', exact: true }).click();
await rh.getByRole('button', { name: 'Feed', exact: true }).click();
await rh.waitForTimeout(200);

// 4. Sem confirmar o e-mail, não aparece na busca, mas a página abre.
await rh.goto(`/vagas?q=${encodeURIComponent('recepcionista bilingue')}`);
ok((await rh.locator(`a[href="/vagas/${slug}"]`).count()) === 0, 'sem e-mail confirmado fica fora da busca');
await rh.goto('/painel');
await rh.locator('.proximo').waitFor();
await rh.getByRole('button', { name: 'Enviar link de confirmação' }).click();
await rh.waitForSelector('text=abrir o link de acesso');
const linkAcesso = await rh.getByRole('link', { name: 'abrir o link de acesso' }).getAttribute('href');
await rh.goto(linkAcesso);
await rh.getByRole('button', { name: 'Entrar na minha conta' }).click();
await rh.waitForURL('**/painel**');
await rh.goto(`/vagas?q=${encodeURIComponent('RECEPCIONISTA bilingue')}`);
ok((await rh.locator(`a[href="/vagas/${slug}"]`).count()) === 1, 'confirmado aparece na busca, sem depender de acento');

// 5. Candidatura e conversa.
const cand = await novo(390, 844);
await cand.goto(`/vagas/${slug}`);
ok(await cand.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => JSON.parse(s.textContent)['@type'] === 'JobPosting')), 'JSON-LD JobPosting');
ok((await cand.locator('meta[property="og:image"]').getAttribute('content')).includes('opengraph-image'), 'imagem de prévia');
const og = await cand.request.get((await cand.locator('meta[property="og:image"]').getAttribute('content')).replace(/^https?:\/\/[^/]+/, ''));
ok(og.ok() && og.headers()['content-type'] === 'image/png', 'imagem de prévia responde');
const emailCand = `cand${carimbo}@teste.com.br`;
await cand.locator('input[name=nome]').fill('Maria da Silva');
await cand.locator('input[name=telefone]').fill('17988887777');
await cand.locator('input[name=email]').fill(emailCand);
await cand.locator('input[name=senha]').fill('senhaforte123');
await cand.getByRole('button', { name: 'Criar conta e candidatar-me' }).click();
await cand.waitForURL('**/conversas/**');
ok(await cand.getByText('Candidatura enviada').isVisible(), 'conta e candidatura de uma vez');
const urlConversa = cand.url().split('?')[0];
await cand.locator('#mensagem').fill('Olá, tenho interesse na vaga.');
await cand.keyboard.press('Enter');
await cand.waitForSelector('.msg-minha');
await rh.goto(urlPainel);
ok((await rh.getByText('1 não lida').count()) >= 1, 'empresa vê mensagem não lida');
await rh.getByRole('link', { name: 'Maria da Silva' }).click();
await rh.waitForURL('**/conversas/**');
ok((await rh.locator('.msg').first().innerText()).includes('tenho interesse'), 'empresa lê a mensagem');
await rh.getByRole('button', { name: /Gostaria de marcar/ }).click();
await rh.getByRole('button', { name: 'Enviar', exact: true }).click();
await rh.waitForSelector('.msg-minha');
await cand.waitForSelector('.msg:not(.msg-minha)', { timeout: 9000 });
ok(true, 'candidato recebe a resposta sem recarregar');
await rh.locator('select[name=etapa]').selectOption('entrevista');
await rh.waitForTimeout(600);
await cand.reload();
ok((await cand.locator('.fatos-lado dd').first().innerText()) === 'Entrevista', 'candidato vê a etapa');
ok(await cand.getByRole('link', { name: 'Disponível no Plus' }).first().isVisible(), 'abertura é extra do Plus');

// 5b. Sem cadastro: solta o PDF na página inicial, os dados se preenchem e as vagas aparecem.
writeFileSync(join(SAIDA, 'curriculo.pdf'), pdfComTexto(['Joana Ferreira Lima', 'Recepcionista', 'joana' + carimbo + '@teste.com.br', '(17) 99123-4567', 'Sao Jose do Rio Preto', '', 'Resumo profissional', 'Cinco anos de experiencia como recepcionista em clinicas.']));
const soltou = await novo();
await soltou.goto('/');
await soltou.locator('input[name=curriculo]').setInputFiles(join(SAIDA, 'curriculo.pdf'));
await soltou.waitForSelector('text=Confira seus dados');
ok((await soltou.locator('input[name=nome]').inputValue()) === 'Joana Ferreira Lima', 'nome vem do currículo');
ok((await soltou.locator('input[name=telefone]').inputValue()) === '(17) 99123-4567', 'telefone vem do currículo');
ok((await soltou.locator('input[name=email]').inputValue()).startsWith('joana'), 'e-mail vem do currículo');
ok(((await soltou.locator('.sugeridas li').first().innerText()).toLowerCase()).includes('recepcionista'), 'a vaga que combina vem primeiro', (await soltou.locator('.sugeridas li').first().innerText()).split('\n')[0]);
await soltou.locator('.porta').first().screenshot({ path: join(SAIDA, 'porta-lida.png') });
await soltou.locator('input[name=senha]').fill('senhaforte123');
await soltou.locator('.sugeridas li').first().getByRole('button', { name: 'Candidatar-me' }).click();
await soltou.waitForURL('**/conversas/**');
ok(await soltou.getByText('Candidatura enviada').isVisible(), 'um arquivo e uma senha: conta e candidatura');
await soltou.goto('/candidato/perfil');
ok((await soltou.locator('input[name=titulo]').inputValue()) === 'Recepcionista', 'perfil nasce do currículo');
ok((await soltou.getByRole('link', { name: 'curriculo.pdf' }).count()) === 1, 'currículo fica guardado para a empresa');
await soltou.goto('/');
const naoPdf = join(SAIDA, 'nao.pdf');
writeFileSync(naoPdf, 'não é pdf');
const out2 = await novo();
await out2.goto('/');
await out2.locator('input[name=curriculo]').setInputFiles(naoPdf);
await out2.waitForSelector('text=Envie o currículo em PDF');
ok(true, 'arquivo que não é PDF recebe aviso claro');

// 5c. Colar o texto da vaga.
const colar2 = await novo();
await criarEmpresa(colar2, `colar${carimbo}@teste.com.br`, 'Restaurante Colado');
await colar2.goto('/publicar');
await colar2.getByPlaceholder('Pode ser a mensagem').fill('Vaga: Auxiliar de Cozinha\nRestaurante em Mirassol, CLT, presencial.\nSalário R$ 1.900,00\n\nAtividades:\n- Preparar alimentos e organizar a cozinha todos os dias\n\nRequisitos:\n- Experiência\n\nBenefícios:\n- Vale-transporte');
await colar2.getByRole('button', { name: 'Preencher com este texto' }).click();
await colar2.waitForFunction(() => document.querySelector('input[name=titulo]').value === 'Auxiliar de Cozinha');
ok((await colar2.locator('select[name=cidade]').inputValue()) === 'mirassol', 'texto colado preenche cidade');
ok((await colar2.locator('input[name=salario]').inputValue()) === '1.900,00', 'texto colado preenche salário');

// Home com vagas e empresas de verdade.
const vit = await novo();
await vit.goto('/');
ok((await vit.locator('.carrossel-trilho-apple .vaga-cartao').count()) > 0, 'carrossel mostra vagas');
const az = vit.locator('.letreiro .azulejo').first();
const hrefAz = await az.getAttribute('href');
await vit.goto(hrefAz);
ok(vit.url().includes('/empresas/'), 'letreiro leva à empresa');
await vit.goto('/anunciantes');
ok((await vit.locator('h1').innerText()).includes('Anuncie'), 'aba de anunciantes abre');

// 6. Permissões e conta existente.
const anon = await novo();
await anon.goto(urlConversa);
ok(anon.url().includes('/entrar'), 'conversa exige conta');
await anon.goto(`/vagas/${slug}`);
await anon.locator('input[name=nome]').fill('Pessoa Impostora');
await anon.locator('input[name=telefone]').fill('17900000000');
await anon.locator('input[name=email]').fill(emailCand);
await anon.locator('input[name=senha]').fill('outrasenha123');
await anon.getByRole('button', { name: 'Criar conta e candidatar-me' }).click();
await anon.waitForSelector('text=já tem conta');
ok(anon.url().includes(`/vagas/${slug}`), 'e-mail existente não entra nem se candidata');
const outro = await novo();
await criarEmpresa(outro, `outro${carimbo}@teste.com.br`, 'Outra Empresa');
await outro.goto('/publicar');
await preencherVaga(outro, 'Vaga de outra empresa');
await outro.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await outro.waitForURL('**/painel/vagas/**');
ok((await outro.goto(urlConversa)).status() === 404, 'outra empresa não abre a conversa');
ok((await outro.goto(urlPainel)).status() === 404, 'outra empresa não abre a vaga alheia');

// 7. Currículo.
const pdf = join(SAIDA, 'cv.pdf');
writeFileSync(pdf, '%PDF-1.4 teste');
const falso = join(SAIDA, 'falso.pdf');
writeFileSync(falso, '<html>não é pdf</html>');
await cand.goto('/candidato/perfil');
await cand.locator('#arquivo-curriculo').setInputFiles(falso);
await cand.waitForSelector('text=Envie o currículo em PDF');
ok(true, 'arquivo falso é recusado');
await cand.locator('#arquivo-curriculo').setInputFiles(pdf);
await cand.waitForSelector('text=Arquivo atual');
const hrefCv = await cand.getByRole('link', { name: 'cv.pdf' }).getAttribute('href');
await cand.locator('input[name=titulo]').fill('Recepcionista');
await cand.locator('select[name=cidade]').selectOption('sao-jose-do-rio-preto');
await cand.locator('textarea[name=resumo]').fill('Cinco anos de experiência em recepção de clínicas.');
await cand.locator('input[name=talentos]').check();
await cand.getByRole('button', { name: 'Salvar perfil' }).click();
await cand.waitForSelector('text=Perfil salvo');
ok((await outro.request.get(hrefCv)).status() === 404, 'outra empresa não baixa o currículo');
await rh.goto(urlConversa);
const cv = await rh.getByRole('link', { name: 'Baixar currículo' }).getAttribute('href');
ok((await rh.request.get(cv)).status() === 200, 'empresa da candidatura baixa o currículo');
await cand.goto('/candidato/alertas');
await cand.locator('input[name=termo]').fill('recepcionista');
await cand.getByRole('button', { name: 'Criar alerta' }).click();
await cand.waitForSelector('text=Alerta criado');
ok(true, 'cria alerta');

// 8. Plano: libera modelos e cor; QR Code continua legível em todos.
await rh.goto('/painel');
await rh.goto('/publicar');
await preencherVaga(rh, 'Segunda vaga no grátis');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForURL('**/painel/vagas/**');
ok(true, 'plano grátis aceita a segunda vaga');
await rh.goto('/publicar');
await preencherVaga(rh, 'Terceira vaga no grátis');
await rh.getByRole('button', { name: 'Publicar e gerar a arte' }).click();
await rh.waitForSelector('text=Seu plano permite 2 vagas');
ok(true, 'plano grátis barra a terceira vaga');
await rh.goto('/painel/talentos');
ok(await rh.getByRole('link', { name: 'Ver planos' }).isVisible(), 'talentos travado sem plano');
await rh.goto('/painel/plano');
await rh.getByRole('button', { name: /Assinar Profissional/ }).click();
await rh.waitForURL('**ok=1');
await rh.goto(`${urlPainel}?aba=arte`);
await rh.waitForTimeout(500);
await rh.setViewportSize({ width: 1280, height: 1300 });
await rh.getByRole('button', { name: 'Feed', exact: true }).click();
for (const m of ['Cartão', 'Pôster', 'Dividida', 'Ingresso', 'Bolhas', 'Ficha', 'Tipográfica', 'Com foto', 'Foto inteira']) {
  for (const paleta of ['Céu', 'Pêssego', 'Grafite']) {
    await aba(rh, 'Modelo');
    await rh.getByRole('button', { name: m, exact: true }).click();
    await aba(rh, 'Cores');
    await rh.getByRole('button', { name: paleta, exact: true }).click();
    await rh.waitForTimeout(150);
    const lido = await lerQr(rh);
    if (lido !== link) ok(false, `QR Code em ${m} ${paleta}`, String(lido));
    await rh.locator('.editor-previa canvas').screenshot({ path: join(SAIDA, `arte-${m}-${paleta}.png`) });
  }
}
ok(true, 'QR Code conferido nos nove modelos e três paletas');
await aba(rh, 'Cores próprias');
await rh.getByRole('button', { name: /^Destaque:/ }).click();
await rh.locator('.seletor-cor-painel input').fill('2E7D5B');
await rh.waitForTimeout(250);
ok((await rh.getByRole('button', { name: /^Destaque:/ }).getAttribute('aria-label')) === 'Destaque: #2E7D5B', 'seletor de cor do site aceita o código');
const area = rh.locator('.seletor-area');
const caixaArea = await area.boundingBox();
await rh.mouse.click(caixaArea.x + caixaArea.width * 0.8, caixaArea.y + caixaArea.height * 0.3);
ok((await rh.getByRole('button', { name: /^Destaque:/ }).getAttribute('aria-label')) !== 'Destaque: #2E7D5B', 'arrastar na área muda a cor');
await rh.keyboard.press('Escape');
ok((await rh.locator('.seletor-cor-painel').count()) === 0, 'seletor de cor fecha com Esc');
await aba(rh, 'Modelo');
await rh.getByRole('button', { name: 'Cartão', exact: true }).click();
await aba(rh, 'Texto');
for (const fonte of ['Inter', 'Poppins', 'Manrope', 'Montserrat', 'DM Sans', 'Nunito', 'Playfair Display', 'Lora', 'Times New Roman']) {
  await rh.getByRole('button', { name: fonte, exact: true }).click();
  await rh.waitForTimeout(400);
  const lido = await lerQr(rh);
  if (lido !== link) ok(false, `QR Code na fonte ${fonte}`, String(lido));
  await rh.locator('.editor-previa canvas').screenshot({ path: join(SAIDA, `fonte-${fonte}.png`) });
}
ok(true, 'as nove fontes desenham e o QR Code segue legível');
await rh.getByRole('button', { name: 'Inter', exact: true }).click();
await aba(rh, 'QR Code');
await rh.getByRole('button', { name: 'Pontos', exact: true }).click();
await rh.waitForTimeout(200);
ok((await lerQr(rh)) === link, 'QR Code em pontos é lido');
await rh.getByLabel('Meu WhatsApp').check();
await rh.waitForTimeout(250);
ok(((await lerQr(rh)) ?? '').startsWith('https://wa.me/5517999999999'), 'QR Code leva ao WhatsApp do contratante');
await rh.getByLabel('Página da vaga').check();
await rh.waitForTimeout(600);
await rh.reload();
await rh.waitForTimeout(500);
await aba(rh, 'QR Code');
ok(await rh.getByRole('button', { name: 'Pontos', exact: true }).getAttribute('aria-pressed') === 'true', 'personalização fica salva');
await aba(rh, 'Legenda');
const legenda = await rh.locator('#legenda').innerText();
ok(legenda.includes('Terceira') || legenda.includes(link) , 'legenda traz o link', legenda.split('\n')[0]);
ok(legenda.includes('#VagasRioPreto') && legenda.includes('✓'), 'legenda do Instagram tem benefícios e hashtags');
await rh.getByRole('button', { name: 'WhatsApp', exact: true }).click();
ok((await rh.locator('#legenda').innerText()).startsWith('*Vaga:'), 'legenda muda para o estilo do WhatsApp');
await rh.locator('textarea[data-parte=final]').fill('Texto meu');
await rh.locator('textarea[data-parte=requisitos]').fill('');
await rh.getByRole('button', { name: 'Copiar legenda' }).click();
const copiada = await rh.evaluate(() => navigator.clipboard.readText());
ok(copiada.endsWith('Texto meu') && !copiada.includes('*Requisitos:*'), 'legenda em campos: edita, apaga uma parte e copia o resultado');
await aba(rh, 'Foto e logo');
const dataFoto = await rh.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 800;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1200, 800);
  g.addColorStop(0, '#8fb5dd'); g.addColorStop(1, '#f2c7ab');
  x.fillStyle = g; x.fillRect(0, 0, 1200, 800);
  return c.toDataURL('image/png').split(',')[1];
});
writeFileSync(join(SAIDA, 'foto.png'), Buffer.from(dataFoto, 'base64'));
await rh.locator('#imagem').setInputFiles(join(SAIDA, 'foto.png'));
await rh.getByRole('button', { name: 'Remover foto' }).waitFor();
await rh.waitForTimeout(400);
ok((await lerQr(rh)) === link, 'arte com foto anexada continua legível');
await rh.locator('.editor-previa canvas').screenshot({ path: join(SAIDA, 'arte-com-foto.png') });
const antesFoco = await rh.locator('.editor-previa canvas').evaluate((c) => c.toDataURL());
await rh.getByLabel('Enquadrar na horizontal').fill('0');
await rh.getByLabel('Enquadrar na vertical').fill('0');
await rh.waitForTimeout(250);
ok((await rh.locator('.editor-previa canvas').evaluate((c) => c.toDataURL())) !== antesFoco, 'enquadramento da foto muda a arte');
await aba(rh, 'Modelo');
await rh.getByRole('button', { name: 'Foto inteira', exact: true }).click();
await rh.waitForTimeout(250);
await rh.locator('.editor-previa canvas').screenshot({ path: join(SAIDA, 'arte-foto-inteira.png') });
await rh.getByRole('button', { name: 'Cartão', exact: true }).click();
await aba(rh, 'Foto e logo');
const logoPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
writeFileSync(join(SAIDA, 'logo.png'), logoPng);
await rh.locator('#logo').setInputFiles(join(SAIDA, 'logo.png'));
await rh.waitForTimeout(600);
ok((await rh.locator('.aviso-erro').count()) === 0, 'logo aceito');
writeFileSync(join(SAIDA, 'logo.svg.png'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
await rh.locator('#logo').setInputFiles(join(SAIDA, 'logo.svg.png'));
await rh.waitForSelector('text=Envie o logo em PNG');
ok(true, 'SVG disfarçado é recusado');
await rh.goto('/painel/talentos');
ok((await rh.getByText('Maria da Silva').count()) >= 1, 'talentos mostra quem aceitou');
await rh.goto(urlPainel);
await rh.getByRole('button', { name: 'Destacar vaga' }).click();
await rh.waitForSelector('text=Tirar destaque');
await rh.goto(`/vagas/${slug}`);

// 9. Denúncia e moderação.
await anon.goto(`/vagas/${slug}`);
await anon.getByText('Denunciar esta vaga').click();
await anon.locator('textarea[name=motivo]').fill('Pediram dinheiro para a entrevista');
await anon.getByRole('button', { name: 'Enviar denúncia' }).click();
await anon.waitForSelector('text=Denúncia enviada');
ok(true, 'denúncia enviada');
if (process.env.ADMIN) {
  const adm = await novo();
  await adm.goto('/admin');
  ok(!adm.url().includes('/admin'), 'admin barra quem não é');
  await criarEmpresa(adm, process.env.ADMIN, 'Moderação').catch(() => {});
  if (adm.url().includes('/painel')) {
    await adm.goto('/admin/denuncias');
    ok((await adm.getByText('Pediram dinheiro para a entrevista').count()) >= 1, 'moderação vê a denúncia');
    await adm.locator('.cartao', { hasText: 'Pediram dinheiro' }).first().getByRole('button', { name: 'Arquivar' }).click();
    await adm.waitForTimeout(500);
    ok(true, 'moderação arquiva a denúncia');
  }
}

// 10. Vaga encerrada: a arte antiga continua levando a uma página útil.
await rh.goto(urlPainel);
await rh.getByRole('button', { name: 'Encerrar' }).click();
await rh.waitForSelector('text=Reabrir por 30 dias');
await anon.goto(`/vagas/${slug}`);
ok(await anon.getByText('Esta vaga não recebe mais candidaturas').isVisible(), 'QR antigo abre vaga encerrada sem formulário');
ok((await anon.locator('input[name=email]').count()) === 0, 'sem formulário de candidatura');
ok((await anon.locator('meta[name=robots]').first().getAttribute('content')).includes('noindex'), 'encerrada fica noindex');

// 10b. Plus: os quatro extras.
const plusC = await novo();
await plusC.goto('/candidato/perfil').catch(() => {});
const emailPlus = `plus${carimbo}@teste.com.br`;
await plusC.goto('/criar-conta');
await plusC.locator('input[name=nome]').fill('Paula Plus');
await plusC.locator('input[name=email]').fill(emailPlus);
await plusC.locator('input[name=telefone]').fill('17955554444');
await plusC.locator('input[name=senha][type=password]').fill('curta');
await plusC.getByRole('button', { name: 'Criar minha conta' }).click();
await plusC.waitForSelector('#erro-senha');
ok(true, 'senha fraca é barrada');
await plusC.locator('input[name=senha][type=password]').fill('senhaforte123');
await plusC.getByRole('button', { name: 'Criar minha conta' }).click();
await plusC.waitForURL('**/candidato**');
ok(true, 'cadastro já entra na conta');
await plusC.getByRole('button', { name: 'Enviar link de confirmação' }).click();
await plusC.waitForSelector('text=abrir o link de acesso');
const linkConfirma = await plusC.getByRole('link', { name: 'abrir o link de acesso' }).getAttribute('href');
await plusC.locator('.conta-botao').click();
await plusC.locator('.conta-menu').getByRole('button', { name: 'Sair' }).click();
await plusC.waitForURL(BASE + '/');
await plusC.goto('/entrar');
await plusC.locator('form.form-entrar input[type=email]').fill(emailPlus);
await plusC.locator('input[name=senha][type=password]').fill('senhaforte123');
await plusC.getByRole('button', { name: 'Entrar', exact: true }).last().click();
await plusC.waitForSelector('text=Confirme seu e-mail');
ok(true, 'senha só vale depois de confirmar o e-mail');
await plusC.goto(linkConfirma);
await plusC.getByRole('button', { name: 'Entrar na minha conta' }).click();
await plusC.waitForURL('**/candidato**');
ok(true, 'confirmou e caiu na própria conta');
await plusC.locator('.conta-botao').click();
await plusC.locator('.conta-menu').getByRole('button', { name: 'Sair' }).click();
await plusC.waitForURL(BASE + '/');
await plusC.goto('/entrar');
await plusC.locator('form.form-entrar input[type=email]').fill(emailPlus);
await plusC.locator('input[name=senha][type=password]').fill('senhaerrada1');
await plusC.getByRole('button', { name: 'Entrar', exact: true }).last().click();
await plusC.waitForSelector('text=E-mail ou senha incorretos');
await plusC.locator('input[name=senha][type=password]').fill('senhaforte123');
await plusC.getByRole('button', { name: 'Entrar', exact: true }).last().click();
await plusC.waitForURL('**/candidato**');
ok(true, 'login com senha leva à conta do candidato');
await plusC.goto('/candidato/perfil');
await plusC.locator('input[name=titulo]').fill('Recepcionista');
await plusC.locator('select[name=cidade]').selectOption('sao-jose-do-rio-preto');
await plusC.locator('textarea[name=resumo]').fill('Cinco anos em recepção de clínicas. Atendimento ao público.');
await plusC.getByRole('button', { name: 'Salvar perfil' }).click();
await plusC.waitForSelector('text=Perfil salvo');
await plusC.goto('/candidato/curriculo');
ok((await plusC.getByRole('link', { name: 'Liberar no Plus' }).count()) === 1, 'currículo pronto é extra do Plus');
await plusC.goto('/candidato/plano');
await plusC.getByRole('button', { name: /Assinar Plus/ }).click();
await plusC.waitForURL('**ok=1');
await plusC.goto('/candidato/curriculo');
ok((await plusC.getByRole('link', { name: 'Baixar PDF' }).count()) === 1, 'Plus libera o currículo em PDF');
ok((await plusC.locator('.cv h2').innerText()) === 'PAULA PLUS', 'currículo traz os dados da pessoa');
const cvPdf = await plusC.context().request.get('/api/curriculo/pronto');
const cvBytes = (await cvPdf.body()).toString('latin1');
ok(cvPdf.headers()['content-type'] === 'application/pdf' && cvBytes.startsWith('%PDF'), 'currículo baixa como PDF de verdade');
ok(/filename\*=UTF-8''Curr%C3%ADculo%20-%20Paula%20Plus\.pdf/.test(cvPdf.headers()['content-disposition'] ?? ''), 'arquivo leva o nome da pessoa');
await plusC.goto('/vagas?q=recepcionista');
await plusC.locator('.vaga-linha').first().click();
await plusC.waitForURL('**/vagas/**');
ok(await plusC.getByText(/Combina \d+% com o seu perfil/).isVisible(), 'Plus mostra quanto a vaga combina');
await plusC.getByRole('button', { name: 'Candidatar-me' }).click();
await plusC.waitForURL('**/conversas/**');
ok((await plusC.locator('.rapidas').count()) === 0, 'conversa sem respostas sugeridas');

// Menu de seleção próprio: abre, escolhe e o formulário recebe o valor.
const menu = await novo();
await criarEmpresa(menu, `menu${carimbo}@teste.com.br`, 'Empresa do Menu');
await menu.goto('/publicar');
await menu.locator('.selecao-botao').first().click();
await menu.locator('.selecao-lista li', { hasText: 'Tecnologia' }).click();
ok((await menu.locator('select[name=area]').inputValue()) === 'Tecnologia', 'menu de seleção no estilo do site preenche o campo');
ok((await menu.locator('.selecao-lista').count()) === 0, 'menu fecha depois de escolher');
await menu.locator('.selecao-botao').first().focus();
await menu.keyboard.press('ArrowDown');
await menu.keyboard.press('ArrowDown');
await menu.keyboard.press('Enter');
ok((await menu.locator('select[name=area]').inputValue()) !== 'Tecnologia', 'menu funciona pelo teclado');

// 10c. Cálculos.
const calc = await novo();
await calc.goto('/calculos');
await calc.waitForURL('**/calculos/volta-do-almoco');
await escolherHora(calc, 0, '12:03');
ok((await calc.locator('[data-resultado=volta]').innerText()) === '13:03', 'volta do almoço soma 1 hora');
await calc.getByRole('button', { name: '1h30', exact: true }).click();
ok((await calc.locator('[data-resultado=volta]').innerText()) === '13:33', 'troca o intervalo na hora');
await calc.getByRole('button', { name: '30 min', exact: true }).click();
ok(await calc.getByText('só vale com acordo').isVisible(), 'avisa intervalo abaixo do mínimo');
await calc.getByRole('button', { name: '1h', exact: true }).click();
await escolherHora(calc, 1, '08:00');
ok((await calc.locator('[data-resultado=embora]').innerText()) === '17:00', 'mostra a hora de ir embora');
await calc.goto('/calculos/horas-extras');
await calc.getByLabel('Salário bruto por mês').fill('3.000,00');
await calc.getByLabel('Dias úteis com hora extra', { exact: true }).fill('20');
await calc.getByRole('button', { name: 'Mais em Hora extra por dia útil: horas' }).click();
await calc.getByRole('button', { name: 'Menos em Hora extra por dia útil: horas' }).click();
const norm = async (r) => (await calc.locator(`[data-resultado=${r}]`).innerText()).replace(/\s/g, ' ');
ok((await norm('dia')) === 'R$ 20,45', 'hora extra por dia');
ok((await norm('total')) === 'R$ 472,03', 'horas extras do mês com DSR');
await calc.getByRole('button', { name: 'Pelo ponto de hoje' }).click();
await escolherHora(calc, 3, '17:30');
ok((await calc.locator('[data-resultado=extra]').innerText()) === '30 min', 'hora extra do dia pelo ponto');
ok((await norm('hoje')) === 'R$ 10,23', 'quanto recebe hoje pelo ponto');
await escolherHora(calc, 3, '17:08');
ok(await calc.getByText('tolerância').isVisible(), 'tolerância de 10 minutos');

// Estrutura: quem não entrou vê Entrar e Criar conta.
const nav = await novo();
await nav.goto('/');
ok(await nav.locator('.acoes-topo').getByRole('link', { name: 'Entrar' }).isVisible(), 'topo tem Entrar');
ok(await nav.locator('.acoes-topo').getByRole('link', { name: 'Criar conta' }).isVisible(), 'topo tem Criar conta');
await nav.goto('/?x=1');
await nav.getByLabel('Qual vaga você procura?').fill('motorista');
await nav.getByRole('button', { name: 'Buscar vagas' }).click();
await nav.waitForURL('**/vagas?**');
ok((await nav.locator('.vaga-linha').count()) >= 1, 'busca da página inicial funciona');

// 11. Excluir conta.
await cand.goto('/candidato/conta');
await cand.locator('summary', { hasText: 'Excluir minha conta' }).click();
await cand.locator('input[name=confirmar]').fill('excluir');
await cand.getByRole('button', { name: 'Excluir minha conta' }).click();
await cand.waitForURL(BASE + '/');
await rh.goto(urlConversa);
ok(rh.url() === BASE + urlConversa.replace(BASE, '') && (await rh.locator('h1').innerText()).startsWith('Página não encontrada'), 'excluir conta apaga a conversa');

await b.close();
console.log(falhas ? `\n${falhas} FALHAS` : '\nFluxo completo sem falhas.');
process.exit(falhas ? 1 : 0);
