# Diagnóstico de SEO

- **Segmento:** portal de vagas de emprego com ferramenta de arte para divulgação.
- **Tipo:** site dinâmico com página por vaga, cidade e empresa.
- **Conversão:** contratante publica vaga; candidato se candidata.
- **Público:** RH interno, dono de pequena empresa e agência de RH; pessoas procurando emprego.
- **Abrangência:** local (São José do Rio Preto e região). Outras praças só em fase futura.
- **Intenção de busca:** "vagas em Rio Preto" (candidato); "anunciar vaga grátis" (contratante).
- **Entidade principal:** GR Vagas, site de vagas em São José do Rio Preto.

## Estado técnico

- Title, description e canonical por página; `noindex` em painéis, acesso, vaga encerrada e vaga de conta não confirmada.
- Até `SITE_PUBLICO=1`, tudo fica com `noindex` e `robots.txt` bloqueia o site inteiro.
- JSON-LD: `WebSite` e `FAQPage` na home; `JobPosting` na vaga aberta, só com dados visíveis.
- Imagem de prévia própria por vaga (`/vagas/[slug]/opengraph-image`).
- Sem GA, GTM ou Pixel.

## Pendências

- `{{PREENCHER_RAZAO_SOCIAL}}`, `{{PREENCHER_CNPJ}}`, `{{PREENCHER_ENDERECO}}`, `{{PREENCHER_EMAIL_CONTATO}}`, `{{PREENCHER_ENCARREGADO}}` e `{{PREENCHER_EMAIL_PRIVACIDADE}}` e `{{PREENCHER_PROVEDOR_IA}}`.
- `Organization` no JSON-LD quando houver CNPJ e perfis reais.
- Imagem de prévia própria da home e das páginas sem vaga.
- Lighthouse não foi rodado: deve ser medido no ambiente de produção.
- Validar `JobPosting` no Teste de Pesquisa Aprimorada do Google depois de publicar.
