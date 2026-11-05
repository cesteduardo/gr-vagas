# GR Vagas.

Site de vagas para São José do Rio Preto e região, sem cadastro: o currículo se preenche sozinho, a arte da vaga é personalizável, e há conversa e planos.
Plano do produto em `docs/plano.md`; tarefas técnicas em `docs/implementacao.md`.

## Rodar

```
npm install
npm run dev
```

Abre em http://localhost:4820, sem instalar banco: sem `DATABASE_URL`, usa um Postgres embutido em `.data/pg`. Em desenvolvimento roda em **modo de demonstração**: o link de acesso aparece na tela, e-mails vão para o terminal e o pagamento é simulado.

Para ver com vagas de exemplo: `curl -X POST http://localhost:4820/api/demo/semear`. Essa rota não existe fora do modo de demonstração.

## Verificar

```
npm test
npm run typecheck
npm run build
PERMITIR_PGLITE=1 SIMULADOR=1 COOKIE_INSEGURO=1 ADMIN_EMAILS=admin@teste.com.br PASTA_DADOS=/tmp/gr-vagas-e2e NODE_ENV=production npx next start -p 4820
curl -X POST http://localhost:4820/api/demo/semear
ADMIN=admin@teste.com.br npm run e2e
npm run audit:responsivo
npm run e2e:firefox
```

## Situação

| Fase | Situação |
|---|---|
| 1. Arte, vaga e candidatura | Pronta |
| 2. Conversa e triagem | Pronta |
| 3. Busca e perfis | Pronta |
| 4. Planos | Regras prontas, pagamento só no simulador |
| 5. Expansão | Não construída; cidade, UF, país e moeda já ficam em cada vaga |

## Mapa

Mapa das telas em `docs/plano.md`, seção 4b. Regras em `src/lib`; cálculos em `src/lib/calculos.ts`; desenho da arte em `src/lib/arte/layout.ts`.

## Para ir ao ar

Toda decisão pendente (nome, preços, cidades) fica em `src/lib/config.ts`. Lista completa em `docs/plano.md`, seção 10.

- **Pagamento:** Asaas (`src/lib/pagamentos/asaas.ts`, `src/lib/cobrancas.ts`). Com `ASAAS_API_KEY`, cada mês de plano e cada impulso abre o Checkout do Asaas com Pix e cartão; o webhook `POST /api/pagamentos/asaas` (token em `ASAAS_WEBHOOK_TOKEN`, cabeçalho `asaas-access-token`) libera 30 dias ou marca o impulso como pago. Três dias antes do fim sai um e-mail para renovar. O Checkout recorrente do Asaas é só no cartão, por isso o mês é avulso. Testado contra a documentação, ainda não contra a conta real.
- **IA:** defina `ANTHROPIC_API_KEY`. Modelo padrão `claude-opus-5-5`, trocável em `MODELO_IA_VAGAS`. O caminho com a API real não foi testado com chave; sem chave, regras locais.
- **E-mail:** preencher `SMTP_*`. O envio por SMTP não foi testado com conta real.
- **Alertas:** rodam de hora em hora dentro do servidor (`src/instrumentation.ts`), sozinhos na demonstração. Em produção, escolha um: `ALERTAS_AUTOMATICOS=1` num servidor sempre ligado, ou um cron externo chamando `POST /api/cron/alertas` com `Authorization: Bearer $CRON_SEGREDO` (ex.: `0 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SEGREDO" https://SEU_DOMINIO/api/cron/alertas`). Os dois juntos mandam e-mail em dobro.
- **Administração:** `ADMIN_EMAILS` define quem abre `/admin`: o espaço pago da tela inicial (só aparece empresa com anúncio no ar, posto ali por prazo) e as denúncias. Na demonstração, `admin@teste.com` / `teste1234`.
- **Arquivos:** logo e currículo ficam no Postgres. Bom para começar; com volume, mover para armazenamento de objetos.
- **Instalação:** `.npmrc` usa `legacy-peer-deps` porque o npm 10.9 falha ao resolver esta árvore.

## No ar em grbrands.com.br/vagas

O app roda no Render (`render.yaml`) com Postgres do Neon, e o Worker da GR Brands (`vagas-proxy.js` na pasta GRB) repassa tudo o que começa com `/vagas`. `NEXT_PUBLIC_CAMINHO_BASE=/vagas` liga o `basePath` do Next; endereços escritos à mão (fetch, `<img>`, `<a>`, `<form>`) usam `BASE` de `src/lib/base.ts`. Um `<Link>` do Next nunca leva `BASE`: ele já põe o prefixo sozinho.

Para testar o subcaminho aqui: `NEXT_PUBLIC_CAMINHO_BASE=/vagas NEXT_PUBLIC_SITE_URL=http://localhost:4830/vagas npm run build` e `PORT=4830 ... npm start`, abrindo `http://localhost:4830/vagas`.
