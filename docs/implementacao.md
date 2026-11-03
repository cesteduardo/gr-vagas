# GR Vagas: plano de implementação

> Revisado em 02/11/2026: visual novo, arte personalizável, leitura de currículo e de vaga por IA (`src/lib/ia`), carrossel, letreiro e aba de anunciantes. O estado atual está no `README.md`.

**Goal:** construir as fases 1 a 4 de `docs/plano.md` num site que roda localmente em modo de demonstração.

**Architecture:** Next.js com App Router. Regras em `src/lib` (funções puras ou que recebem `db: Banco`), testadas com Vitest em banco PGlite em memória. Telas e server actions só chamam essas funções. Fornecedores externos (e-mail e pagamento) ficam atrás de uma interface, com simulador.

**Tech Stack:** Next 16.4, React 19, Drizzle 0.45, Postgres ou PGlite, Vitest, playwright-core, `qrcode`, `@fontsource-variable/archivo`, `nodemailer`.

**Spec:** `docs/plano.md`.

## Global Constraints

- Porta 4820. Sem `DATABASE_URL`: PGlite em `.data/pg`.
- Padrões GR Brands 1, 2 e 3 valem para tudo. Todo campo de formulário é obrigatório; o que for opcional vai para outro formulário.
- Sem travessão em texto visível. Sem elementos de "cara de IA" (chip pulsando, selo girando, rótulo com bolinha, número "01" em cartão, degradê com brilho).
- Sem GA, GTM ou rastreamento. Sem dado inventado; dado legal faltando vira `{{PREENCHER_...}}`.
- Visual: linguagem do site da GR Brands, tons lavados, tudo arredondado.
- Rodapé claro, cantos de cima arredondados, centralizado, crédito "Desenvolvido por [símbolo] GR Brands." em Inter.
- Decisões pendentes só em `src/lib/config.ts`.
- Candidato nunca paga para pesquisar, se candidatar ou conversar.
- Cidade, UF, país e moeda ficam em cada vaga. Nenhuma tradução nesta etapa.
- Git: nenhum commit sem o Eduardo pedir.

## Review Focus

1. Título enorme ou palavra sem espaço na arte: o texto encolhe e quebra, nunca sai da arte. Teste em `arte/layout.test.ts`.
2. QR Code em qualquer modelo e cor: continua legível. Teste em `e2e/fluxo.mjs`, decodificando o canvas com `jsqr`.
3. Arte antiga: QR Code de vaga encerrada ou vencida abre a página, sem formulário e com vagas parecidas. Teste em `vagas.test.ts`.
4. Candidatura com e-mail de conta existente sem estar logado: não cria candidatura nem abre sessão; manda link. Duas candidaturas à mesma vaga: fica só uma. Teste em `candidaturas.test.ts`.
5. Outra empresa abrindo conversa, currículo ou candidatura alheia: tratado como inexistente. Teste em `permissoes.test.ts`.

## Estrutura

```
src/lib/config.ts              nome, planos, cidades, áreas, listas
src/lib/db/{schema,client}.ts  tabelas e conexão
src/lib/forms/validators.ts    padrão 2 (vem do Caderno, sem senha)
src/lib/forms/vaga.ts          validação da vaga e da candidatura
src/lib/auth/                  link por e-mail e sessão
src/lib/email.ts               SMTP ou caixa simulada
src/lib/arte/                  layout (puro), cores, desenhar (canvas), modelos
src/lib/vagas.ts               publicar, editar, encerrar, buscar, limites
src/lib/moderacao.ts           golpe e discriminação
src/lib/candidaturas.ts        candidatar, etapas, conversa
src/lib/perfis.ts              perfil, currículo, talentos, salvas, alertas, LGPD
src/lib/planos.ts              plano vigente, limites, assinatura
src/lib/pagamentos/            interface e simulador
src/app/                       telas e rotas
e2e/                           fluxo e auditoria responsiva
seo/                           documentos do padrão 3
```

## Tarefas

Cada tarefa segue a ordem: teste, ver falhar, implementar, ver passar. Comando: `npx vitest run <arquivo>`.

### Tarefa 1: base do projeto
- Criar: `package.json`, configurações, `src/lib/config.ts`, `src/lib/db/*`, `src/lib/forms/validators.ts`, `src/lib/auth/*`, `src/lib/email.ts`.
- Produz: `banco()`, `bancoEmMemoria()`, `pedirLink(db, email, destino)`, `usarLink(db, token)`, `abrirSessao`, `usuarioAtual()`, `enviarEmail(para, assunto, corpo)`.
- Testes: link vale uma vez, expira em 1 hora; sessão expira; link de e-mail desconhecido não revela nada; mais de 5 pedidos em 15 minutos são barrados; o uso do link confirma o e-mail; regras do padrão 2 (`17999999999`, `+55 17 99999-9999`, `5517999999999`, DDD 55).

### Tarefa 2: arte da vaga
- Criar: `src/lib/arte/{cores,layout,modelos,desenhar}.ts`.
- Produz: `textoSobre(cor)`, `contraste(a,b)`, `ajustarTexto(texto, caixa, medir)`, `montarArte(dados, formato, modelo, medir)`, `desenharArte(canvas, dados, opcoes)`.
- Testes: texto sobre fundo escuro é claro e vice-versa, com contraste mínimo de 4,5; título de 300 caracteres e palavra de 80 letras ficam dentro da caixa; `montarArte` não sobrepõe título, detalhes e QR Code nos três formatos e seis modelos.

### Tarefa 3: vagas e moderação
- Criar: `src/lib/moderacao.ts`, `src/lib/forms/vaga.ts`, `src/lib/vagas.ts`.
- Produz: `revisarTexto(t)`, `validarVaga(c)`, `publicarSemConta(db,d)`, `publicarVaga(db,empresaId,d)`, `editarVaga`, `mudarEstadoVaga`, `vagaPublica(db,slug)`, `buscarVagas(db,filtros)`, `vagaAceitaCandidatura(v, agora)`.
- Testes: "taxa de inscrição" barra; "boa aparência" barra; "2 a 5 anos de experiência" e "salário pago por Pix" passam; slug único; vaga vencida em 30 dias não aceita candidatura e ainda abre; conta sem e-mail confirmado não aparece na busca; busca "tecnico enfermagem" acha "Técnico de Enfermagem"; `%` e `_` na busca não viram curinga; destaque vem primeiro.

### Tarefa 4: candidatura e conversa
- Criar: `src/lib/candidaturas.ts`.
- Produz: `candidatarSemConta`, `candidatarLogado`, `candidaturasDaVaga`, `candidaturasDoCandidato`, `mudarEtapa`, `enviarMensagem`, `conversa`, `marcarLida`, `naoLidas`.
- Testes: casos do item 4 do Review Focus; empresa não muda etapa de vaga alheia; mensagem vazia ou com mais de 2.000 caracteres é barrada; contagem de não lidas por lado; aviso por e-mail no máximo 1 a cada 15 minutos por conversa; vaga fechada não recebe candidatura; item 5 do Review Focus em `permissoes.test.ts`.

### Tarefa 5: perfis, alertas e LGPD
- Criar: `src/lib/perfis.ts`.
- Produz: `salvarPerfil`, `guardarCurriculo`, `podeBaixarCurriculo`, `alternarSalva`, `criarAlerta`, `enviarAlertas(db, agora)`, `dadosDoUsuario`, `excluirConta`, `buscarTalentos`.
- Testes: só PDF de verdade (assinatura `%PDF`) e até 3 MB; talentos só lista quem aceitou; alerta não reenvia a mesma vaga; excluir conta remove perfil, mensagens e candidaturas; denúncias persistem.

### Tarefa 6: planos e pagamento
- Criar: `src/lib/planos.ts`, `src/lib/pagamentos/{provedor,simulado}.ts`.
- Produz: `planoDe(db,usuarioId,agora)`, `limites(plano)`, `assinar`, `cancelar`, `aplicarEvento`.
- Testes: quarta regra do grátis: segunda vaga aberta é barrada; assinatura vencida volta ao grátis sem fechar vagas abertas, só barrando novas; evento de pagamento repetido não duplica; modelo pago no plano grátis cai no modelo grátis no servidor; destaque respeita a cota; simulador desligado em produção.

### Tarefa 7: identidade e telas públicas
- Criar: `src/styles/*`, `src/components/*`, `/`, `/vagas`, `/vagas/[slug]`, `/empresas/[slug]`, `/planos`, `/publicar`, `/entrar`, `/termos`, `/privacidade`, `not-found`, `robots`, `sitemap`.
- Verificar: hero com arte ao vivo; JSON-LD `JobPosting` só com dados visíveis; imagem de prévia por vaga; vaga encerrada com `noindex`.

### Tarefa 8: painéis
- Criar: `/painel`, `/painel/vagas/[id]` (candidatos, arte, editar), `/painel/empresa`, `/painel/plano`, `/painel/talentos`, `/conversas/[id]`, `/candidato`, `/candidato/perfil`, `/candidato/salvas`, `/candidato/alertas`, `/candidato/plano`, `/admin`, rotas `/api/logo`, `/api/curriculo`, `/api/conversas`, `/api/meus-dados`, `/api/cron/alertas`, `/api/demo/semear`.

### Tarefa 9: auditoria
- `e2e/fluxo.mjs`: publicar sem conta, baixar arte, ler QR Code, candidatar, conversar nos dois lados, assinar, buscar, denunciar.
- `e2e/responsivo.mjs`: fotos nas 7 larguras, varredura 320 a 1920 de 40 em 40, rodada final.
- Documentos em `seo/`, README, `npm test`, `npm run typecheck`, `npm run build`.
