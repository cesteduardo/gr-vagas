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

- **Pagamento:** implementar `ProvedorPagamento` (`src/lib/pagamentos/provedor.ts`) e ligar em `provedorAtivo()`. Fora do modo de demonstração, as telas dizem que a assinatura está para chegar.
- **IA:** defina `ANTHROPIC_API_KEY`. Modelo padrão `claude-opus-5-5`, trocável em `MODELO_IA_VAGAS`. O caminho com a API real não foi testado com chave; sem chave, regras locais.
- **E-mail:** preencher `SMTP_*`. O envio por SMTP não foi testado com conta real.
- **Alertas:** chamar `POST /api/cron/alertas` de hora em hora, com `Authorization: Bearer $CRON_SEGREDO`.
- **Moderação:** `ADMIN_EMAILS` define quem abre `/admin`.
- **Arquivos:** logo e currículo ficam no Postgres. Bom para começar; com volume, mover para armazenamento de objetos.
- **Instalação:** `.npmrc` usa `legacy-peer-deps` porque o npm 10.9 falha ao resolver esta árvore.
