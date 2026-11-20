# Auditoria — rodada 2 (20/11/2026)

**Base:** `main` em `61d240d`, que já inclui a rodada 1.

**Foco desta rodada:**
- automação (agendador, Autopilot, publicação social);
- geração com IA;
- verificação pós-merge;
- falhas reais relatadas pelo Froc: limite de compartilhamento do LinkedIn, risco de spam no TikTok, limites do YouTube e créditos do X.

## Erros encontrados e corrigidos

| # | Área | Problema | Correção |
|---|------|----------|----------|
| 1 | CI / Smoke pós-merge | O "Production Smoke After Merge" **falhava em todo merge** (PRs #72, #73, #74 e #75). Ele exigia `socialRepurpose.twitter.thread`, mas o X foi retirado do produto e outro teste (`finalCommittee`) exige justamente que o `twitter` **não** exista. | O smoke valida o contrato atual: sem X, com Instagram e Kwai. |
| 3 | Imagens com IA | O `gemini-3.1-flash-image` (modelo padrão) foi **desligado pelo Google em 29/10/2026**. Toda imagem gastava uma chamada que falhava antes de cair no modelo Lite, de qualidade menor. | O padrão passa a ser o `gemini-nano-banana-2.1`, substituto oficial. Um modelo antigo configurado na Vercel é trocado automaticamente pelo substituto. |
| 5 | Visão e Alma | Chamadas fixas ao `gemini-3.7-flash`, substituído pelo 3.8. | Passam a usar o modelo de texto configurado (`gemini-3.8-flash`). |
| 6 | Anti-queda da IA | O último recurso chamava `gemini-3.1-pro`, um modelo que não existe, desperdiçando uma tentativa. | Troca por `gemini-3.6-flash`. |
| 7 | Instagram / Facebook / TikTok | Quando o Storage falha, a imagem do conteúdo fica salva como `data:` URI. As redes **não aceitam** esse formato (precisam de uma URL pública), então a publicação falhava. Caminhos relativos também quebravam. | Antes do envio, a mídia vira URL pública: o endpoint `/api/content/:id/image` ou a URL absoluta do Portal. |
| 8 | SEO / sitemap | `image:loc` no sitemap saía com caminho relativo (`/icons/...`), formato inválido para o Google Imagens. | Só são publicadas URLs absolutas. |
| 9 | Painel | O total de "publicados no mês" usava o mês em UTC (às 21h do último dia, já contava o mês seguinte). | Usa o mês no fuso do aparelho. |
| 10 | Froc (agenda) | Para falhas antigas do X, o Froc mandava "recarregar créditos no developer.x.com", mas o X foi retirado. Limite e spam viravam um genérico "tentar mais tarde". | Explicações corretas, para não recarregar o X nem reenviar falhas antigas em massa. |

## Automação de 5 em 5 minutos (configuração externa)

O GitHub Actions **atrasa e pula** agendamentos de 5 em 5 minutos: na prática, rodava a cada 5 a 12 horas. Os disparos passaram para o **cron-job.org** (gratuito), com estas configurações:

- `POST https://portal-vip-brasil.vercel.app/api/cron/social-publications`, a cada 5 minutos;
- `POST https://portal-vip-brasil.vercel.app/api/cron/video-retries`, a cada 5 minutos;
- cabeçalho `Authorization: Bearer <CRON_SECRET>`;
- respostas **200** e **409** (execução anterior ainda em andamento) são normais.

Os workflows do GitHub continuam ativos como reserva. A trava de execução impede duplicidade.

## Verificação

- Testes: **39 de 52 arquivos executados, 277 testes aprovados e 0 falhas**, incluindo os **12 testes novos** em `test/auditoriaRodada2_2026_11.test.ts`. O resultado é idêntico ao da `main`, mais os testes novos. Os 13 arquivos que sobem um servidor Express real rodam no CI do PR.
- Checagem de tipos: **nenhum erro novo** em relação à `main`.
- Bundles de servidor, função Vercel e cliente: ok. Sintaxe do smoke: ok.

## Ajustes opcionais na Vercel

- `GEMINI_MODEL_IMAGE`: se estiver preenchido com um modelo antigo, pode ser apagado. O código já troca pelo substituto sozinho.

> Voz do Froc: a troca do modelo de voz feita nesta rodada foi **desfeita a pedido do proprietário**. A voz voltou a ser exatamente como era antes (PR de reversão).

> Limite diário por rede e adiamento automático: **removidos a pedido do proprietário**. A publicação voltou a ser exatamente como era antes da rodada 2.
