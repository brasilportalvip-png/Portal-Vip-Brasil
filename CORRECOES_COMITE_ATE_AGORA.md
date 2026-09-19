# Portal Vip Brasil — correções do comitê até 19/09/2026

Este pacote contém a versão corrigida do projeto e um patch para aplicar as mesmas alterações sobre a versão atual da branch `main` do GitHub.

## Correções implementadas neste pacote

### 1. Proteção contra gastos automáticos de vídeo

- A geração automática paga de vídeos pelo Veo fica desligada por padrão.
- A variável `AUTO_PAID_VIDEO_GENERATION_ENABLED` precisa estar explicitamente definida como `true` para liberar gastos automáticos.
- Redes que aceitam imagem continuam recebendo publicações com imagem quando o vídeo pago está bloqueado.
- A criação manual de vídeo continua disponível.

Arquivos alterados:

- `.env.example`
- `server/config/index.ts`
- `server/production/autopilotMultimediaR8.ts`
- `test/finalPublicationPipeline.test.ts`
- `test/youtubeAutopilotHardening.test.ts`

Antes: o piloto automático podia solicitar geração paga de vídeo sem uma chave geral de segurança financeira.

Depois: a geração paga automática falha de forma segura e só é ativada por decisão explícita do administrador.

> Importante: mantenha `AUTO_PAID_VIDEO_GENERATION_ENABLED=false` ou não configure a variável na Vercel até a nova produção de vídeos publicitários — marca, produto, pessoas reais, CTA e texto revisado — estar concluída e aprovada.

### 2. Consolidação do SEO dos blogs

- A listagem pública elimina artigos repetidos pelo slug normalizado.
- Quando existem registros duplicados, conserva a versão publicada mais recente.
- Sitemap e robots recebem cabeçalhos de cache adequados para mecanismos de busca e CDN.
- Foram adicionados testes para impedir regressões na deduplicação.

Arquivos alterados:

- `server/production/blogEngine.ts`
- `server/production/router.ts`
- `test/organicSeoR81.test.ts`

Antes: registros duplicados no banco podiam produzir duplicação lógica na listagem pública do blog.

Depois: a camada pública entrega um artigo canônico por slug, privilegiando a publicação mais recente.

## Validação executada

- TypeScript: aprovado.
- Testes automatizados: 204 aprovados.
- Build de produção: aprovado.
- Auditoria npm executada anteriormente: nenhuma vulnerabilidade encontrada.
- Sitemap público verificado: 129 URLs, sendo 113 URLs de blog, sem URLs duplicadas; todas responderam HTTP 200 no momento da auditoria.
- `robots.txt` verificado e apontando para o sitemap.

## Itens identificados pelo comitê que ainda não estão implementados

Estes pontos exigem rodadas próprias de alteração e validação. Eles não devem ser considerados corrigidos por este pacote:

- Exigir `email_verified` antes de conceder perfil administrativo.
- Criar orçamento, limite diário/mensal e livro-razão de custos para IA e vídeos.
- Reconstruir o vídeo publicitário com marca, demonstração do produto, CTA, pessoas reais/licenciadas e texto validado deterministicamente.
- Usar comparação em tempo constante no segredo de bootstrap administrativo.
- Reduzir dados e leituras de banco no endpoint público `/health`.
- Remover origens localhost do CORS de produção.
- Proteger a branch `main` no GitHub.
- Revisar atrasos e observabilidade das automações agendadas.
- Resolver inconsistências de `APP_URL`, CSP e typecheck dos testes.
- Melhorar acessibilidade: cartões de blog por teclado, foco/Escape nos diálogos e contraste.
- Melhorar tratamento de rotas privadas, estados de carregamento e página 404.
- Dividir arquivos monolíticos, reforçar tipagem e revisar dependências de runtime.

## Arquivos deste pacote

- `projeto-corrigido/`: fotografia completa do projeto já corrigido, sem `.git` e sem `node_modules`.
- `correcoes-comite.patch`: alterações exatas para aplicar sobre uma clonagem nova da branch `main`.
- `PASSO_A_PASSO_WINDOWS_CMD.txt`: comandos completos para Windows CMD, testes, push e abertura da Pull Request.

