# GR Vagas: plano do produto

Escrito em 02/11/2026. A marca e o domínio ainda não foram checados no INPI nem no Registro.br.

## 1. O que é

Um site de vagas simples para quem contrata e para quem procura emprego. O contratante preenche a vaga uma vez e recebe a arte pronta para postar e a página da vaga. O candidato chega pela arte, se candidata em um minuto e conversa com o contratante dentro do site.

**Primeira praça:** São José do Rio Preto e cidades vizinhas. Depois o restante do Brasil e, mais tarde, outros países (fase 5, fora deste ciclo).

**A promessa:** nada de cadastro de dez telas, como nos portais grandes. Quem procura emprego solta o currículo em PDF, uma IA preenche os dados e as vagas que combinam aparecem na hora. Quem contrata cola o texto que já usa nos grupos e a vaga se organiza sozinha.

## 2. Para quem

| Público | O que sofre hoje | O que recebe |
|---|---|---|
| RH interno e dono de pequena empresa | Monta arte no Canva, posta em grupos, recebe currículo espalhado pelo WhatsApp | Arte em minutos, candidatos e conversa num lugar só |
| Agência de RH | Muitas vagas abertas ao mesmo tempo, muita arte repetida | Artes em série com a mesma marca, painel por vaga, banco de talentos |
| Candidato | Formulários longos, vagas velhas, golpes | Busca simples, candidatura de um minuto, resposta dentro do site |

## 3. A aposta central

Publicar vaga não é diferencial: o serviço público de Rio Preto, a OLX e o Vagas.com já fazem isso. O diferencial é o tempo economizado pelo contratante.

A arte é a porta de entrada porque tem valor mesmo com o site vazio e divulga o site toda vez que é postada: **arte postada → QR Code ou link → candidatura no site → contratante volta para responder → publica outra vaga.**

**Isto ainda é hipótese.** O RH pode preferir continuar no Canva e no próprio WhatsApp. A seção 8 diz como testar antes de gastar com divulgação.

## 4. Fases

### Fase 1: arte, página da vaga e candidatura
- Publicar sem cadastro prévio: o formulário da vaga pede também nome, WhatsApp, e-mail e empresa, e a conta nasce junto.
- A arte é desenhada ao vivo enquanto a vaga é preenchida. Sai em PNG nos formatos feed (1080×1080), retrato (1080×1350) e stories (1080×1920), com QR Code real.
- Oito modelos, paletas lavadas, cores livres, cores sugeridas a partir do logo, nove fontes (da Poppins à Times New Roman), foto e logo.
- QR Code arredondado ou em pontos, levando à página da vaga ou ao WhatsApp do contratante.
- Se a cor escolhida prejudicar a leitura, o texto se corrige sozinho.
- Página pública da vaga, com prévia para WhatsApp e redes e dados estruturados para o Google Vagas.
- Candidatura sem cadastro: solta o PDF ou preenche nome, WhatsApp e e-mail. Sem senha.
- Texto da vaga colado vira formulário preenchido.
- Entrada no site por link enviado ao e-mail, para os dois públicos.

### Fase 2: conversa e triagem
- Conversa por candidatura, com atualização automática, contador de não lidas e aviso por e-mail.
- Etapas simples: Novo, Em análise, Entrevista, Contratado, Não seguiu.
- Respostas rápidas e botão para continuar no WhatsApp.
- Botão de denúncia e tela de moderação.

### Fase 3: busca e perfis
- Busca por palavra (sem depender de acento), cidade, tipo de contrato, modalidade e área.
- Página de cada cidade e de cada empresa.
- Página inicial com carrossel de vagas e letreiro lento de empresas, clicável.
- Aba própria para anunciantes.
- Perfil do candidato com currículo em PDF, vagas salvas e alertas por e-mail.
- Candidatura de um clique para quem já tem perfil.

### Fase 4: planos
- Limites por plano aplicados no servidor.
- Conector de pagamento atrás de uma interface, com simulador. O provedor real entra quando houver CNPJ e credenciais.
- Banco de talentos, só com candidatos que aceitaram aparecer.

### Fase 5: expansão (não será construída agora)
Cidade, UF, país e moeda já ficam guardados em cada vaga, então abrir outra praça não exige refazer o banco. Tradução e moedas ficam para esta fase.

## 4b. Mapa do site

**Público:** Início (buscar ou soltar o currículo) → Vagas → Vaga → Empresa. Cálculos (volta do almoço, horas extras). Para empresas (como funciona, onde aparece, planos) → Publicar vaga. Entrar. Criar conta.

**Painel da empresa:** Início (próximo passo, números, vagas) → Vaga (candidatos, arte, editar) → Conversa. Empresa, Banco de talentos, Plano, Conta e senha.

**Conta do candidato:** Início (próximo passo, candidaturas, vagas para você) → Conversa. Perfil e arquivo, Currículo pronto, Vagas salvas, Alertas, Plano, Conta e senha.

Quem entra cai direto no próprio painel. Cada tela responde a uma pergunta só, e o painel sempre sugere o próximo passo.

## 5. Planos

**Todos os valores são provisórios** e vivem em `src/lib/config.ts`. Servem para validar com os primeiros clientes. Comparadores citam a Catho a partir de R$ 89, o InfoJobs premium a partir de R$ 199,99 e o Indeed patrocinado a partir de R$ 8 por dia, mas esses números não vêm das próprias plataformas.

| Contratante | Grátis | Essencial, R$ 49/mês | Profissional, R$ 129/mês |
|---|---|---|---|
| Vagas abertas ao mesmo tempo | 2 | 6 | 30 |
| Personalização completa da arte | Sim | Sim | Sim |
| Marca do GR Vagas na arte | Sim | Não | Não |
| Candidatos e conversa | Sem limite | Sem limite | Sem limite |
| Vagas em destaque no carrossel e na busca | Não | 1 | 5 |
| Banco de talentos | Não | Não | Sim |

| Candidato | Grátis | Plus, R$ 9,90/mês |
|---|---|---|
| Pesquisar, se candidatar e conversar | Sempre | Sempre |
| Candidatura aparece primeiro para a empresa | Não | Sim |
| Currículo pronto em PDF | Não | Sim |
| Apresentação pronta para cada vaga | Não | Sim |
| Quanto a vaga combina com o perfil | Não | Sim |
| Saber quando a empresa abriu a candidatura | Não | Sim |
| Alertas por e-mail | Diário | Assim que a vaga sai |
| Destaque no banco de talentos | Não | Sim |

**Ideias para depois, se o Plus precisar de mais força:** revisão do currículo por IA, simulado de entrevista por IA e histórico de ponto salvo no mês. Nada que tranque o acesso a vagas.

**Ponto para o advogado:** "candidatura primeiro" é preferência paga na fila da empresa, então precisa entrar no parecer junto com o restante do Plus.

**Regra que não muda:** o candidato nunca paga para ver vaga ou se candidatar. Há decisões da Justiça do Trabalho contra a cobrança por acesso a banco de vagas e também decisão em sentido contrário, então o tema não é pacífico. O plano Plus só cobra por extras e **precisa do parecer de um advogado trabalhista antes do lançamento.**

**Cálculos grátis (volta do almoço e horas extras):** não dão receita direta, mas trazem gente pela busca do Google e ficam como motivo para voltar ao site.

## 6. Regras e confiança

- **Golpes:** vaga que pede taxa, kit ou curso pago não é publicada. Toda vaga tem botão de denúncia.
- **Discriminação:** o formulário barra termos como "boa aparência", "sexo masculino" e limite de idade, e explica o motivo. A lista precisa da revisão do advogado.
- **E-mail confirmado:** a arte e a página funcionam logo, mas a vaga só aparece na busca depois de confirmar o e-mail.
- **IA:** o currículo só é enviado ao provedor de IA para preencher os dados; precisa constar na Política de privacidade com o nome do provedor. Nada fica guardado até a pessoa se candidatar.
- **LGPD:** telefone e currículo só aparecem para a empresa à qual o candidato se candidatou. O banco de talentos exige aceite específico. O candidato pode baixar seus dados e excluir a conta.
- **Sem dado inventado:** nada de número de clientes, depoimento ou contagem falsa. Os exemplos do modo de demonstração nunca vão para produção.

## 7. Como o site funciona

Next.js 16, TypeScript, Drizzle e Postgres, a mesma base do Caderno de Ofertas. Sem `DATABASE_URL` o projeto roda sozinho com banco embutido e em modo de demonstração: e-mail aparece na tela e pagamento é simulado. Detalhes técnicos em `docs/implementacao.md`.

## 8. Lançamento em Rio Preto

Seu canal é o ponto de partida: clientes da GR Brands, redes e grupos.

**Semana 0, antes de divulgar**
- Parecer do advogado, CNPJ, marca e domínio.
- Colocar no ar com `SITE_PUBLICO=1` e publicar o GR Vagas no Search Console.

**Semanas 1 a 2, teste com 10 contratantes do seu canal**
- Oferta: "Faça a arte da sua próxima vaga de graça."
- Acompanhe cada um de perto e pergunte o que atrapalhou.
- **Critério para seguir:** pelo menos 5 dos 10 publicam, postam a arte e recebem candidatura pelo site.
- **Se não bater:** descubra se o problema é a arte, o link ou a candidatura antes de investir em divulgação.

**Semanas 3 a 8, vagas de verdade**
- Meta: 30 contratantes ativos e vagas novas toda semana.
- Abordar agências de RH com o plano Profissional liberado por 60 dias em troca de opinião.
- Parcerias com associação comercial, contadores (atendem muitas pequenas empresas) e faculdades da cidade.
- Conteúdo diário no Instagram com as artes das vagas publicadas, com autorização do contratante.

**A partir do mês 3, cobrança**
- Ligar o pagamento real e convidar quem mais usa a assinar.
- Testar preços com conversas reais antes de mexer na tabela.

**Números a acompanhar**

| Métrica | Por que importa |
|---|---|
| Vagas publicadas por semana | Oferta real |
| Artes baixadas por vaga | A porta de entrada funciona? |
| Candidaturas por vaga | Principal prova de valor para o RH |
| Tempo até a primeira resposta | Candidato sem resposta não volta |
| Contratantes que publicam de novo em 30 dias | Sinal mais forte de que o produto serve |
| Conversão de grátis para pago | Viabilidade do negócio |

## 9. Riscos

| Risco | O que fazer |
|---|---|
| Contratante continua usando Canva e WhatsApp | Teste das semanas 1 a 2 antes de divulgar |
| Candidatos não chegam | Medir leituras do QR Code por vaga e reforçar o Instagram |
| Cobrança do candidato questionada | Busca e candidatura sempre grátis, parecer jurídico |
| Vagas falsas | Filtros, e-mail confirmado, denúncia, moderação |
| Vazamento de currículos | Acesso por candidatura, testes de permissão, exclusão de conta |
| Serviço público gratuito concorre em vagas | Competir em tempo economizado, não em volume |

## 10. Depende de você

1. Registro da marca e domínio de GR Vagas.
1. Chave da API de IA (`ANTHROPIC_API_KEY`). Sem ela, a leitura usa só regras locais, que acertam o básico e não leem PDF escaneado. Definir o modelo pelo custo: `MODELO_IA_VAGAS` troca sem mexer no código.
2. CNPJ e dados legais dos `{{PREENCHER_...}}` em Termos e Privacidade.
3. Parecer de advogado sobre o plano Plus, os filtros e os textos legais.
4. Provedor de pagamento e credenciais (Asaas e Mercado Pago têm Pix e cartão; ainda não comparei taxas).
5. Conta de e-mail para envio (SMTP) e hospedagem com Postgres.
6. Validar os preços com os primeiros contratantes.

## Fontes da pesquisa

- [Recrutamento: erros de design, fonte pequena e baixo contraste](https://bookingagency.io/blog/common-graphic-design-mistakes-to-avoid-hr-recruiting)
- [Workable: post de vaga em redes sociais](https://resources.workable.com/we-are-hiring-social-media-post)
- [Joveo: vagas em redes sociais](https://www.joveo.com/blog/a-quick-guide-to-getting-social-with-your-job-postings/)
- [Cálculo de hora extra 2026](https://www.ribeirocavalcante.com.br/calculo-de-hora-extra-2026.md)
- [Intervalo intrajornada](https://valorfinal.com.br/guia/intervalo-intrajornada)

- [TRT-RS: empresas de seleção não podem cobrar taxas de candidatos](https://www.lex.com.br/empresas-de-selecao-nao-podem-cobrar-taxas-de-candidatos-a-emprego-decide-5a-turma-do-trt-rs/)
- [TRT-RS: cobrança por acesso a banco de vagas](https://www.sedep.com.br/?p=117320)
- [Decisão que afastou condenação por consulta paga de vagas](https://www.coad.com.br/home/noticias-detalhe/106167/empresa-de-rh-consegue-afastar-condenacao-por-servico-pago-de-consulta-de-vagas)
- [Band Multi: vagas do serviço público em Rio Preto](https://www.band.com.br/band-multi/rio-preto-e-aracatuba/noticias/confira-as-vagas-de-emprego-oferecidas-em-rio-preto-nesta-terca-feira-30-202606301136)
- [OLX: vagas na região de Rio Preto](https://www.olx.com.br/vagas-de-emprego/estado-sp/regiao-de-sao-jose-do-rio-preto)
- [Vagas.com: vagas em Rio Preto](https://www.vagas.com.br/vagas-de-sao-jose-do-rio-preto)
- [Betterteam: Catho](https://www.betterteam.com/br/catho), [InfoJobs](https://www.betterteam.com/br/infojobs) e [sites para anunciar vagas](https://www.betterteam.com/br/sites-para-anunciar-vagas-de-emprego-grátis)
- [Gupy: aviso de privacidade para candidatos](https://www.gupy.io/hubfs/LGPD/RS%20Candidatos/8a%20versao/Aviso%20de%20Privacidade%20-%20Plataforma%20de%20Recrutamento%20e%20Sele%C3%A7%C3%A3o_PT_v.8_12%20dez%202024.pdf)
- [Migalhas: tratamento de currículos na LGPD](https://www.migalhas.com.br/depeso/363808/o-tratamento-dos-curriculos-na-lgpd)
