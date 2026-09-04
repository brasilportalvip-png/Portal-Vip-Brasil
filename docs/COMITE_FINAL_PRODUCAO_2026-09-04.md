# Comitê final de produção — Portal Vip Brasil

## Escopo auditado

- repositório `brasilportalvip-png/Portal-Vip-Brasil`;
- deploy `https://portal-vip-brasil.vercel.app`;
- CI/build;
- autenticação;
- Firestore/Storage;
- rotas e API;
- projetos dinâmicos;
- Vitrine;
- Blog;
- IA;
- scheduler/cron;
- OAuth/redes sociais;
- SEO;
- PWA;
- segurança HTTP;
- dependências;
- configuração mobile;
- documentação operacional.

## Evidência do baseline

O `main` auditado antes deste pacote estava no merge commit:

`94f93ada8c9d7a69bdeed4d1442341c9ccb1add1`

Evidência já registrada:

- 113 testes aprovados, 0 falhas;
- TypeScript aprovado;
- build cliente aprovado;
- build servidor aprovado;
- Vercel success;
- smoke real de produção aprovado;
- Firestore healthy;
- cron e release esperados;
- rotas individuais/SEO/PWA/IndexNow aprovados.

## Achados R6

1. `capacitor.config.ts` ainda carregava identidade central Froc.IA.
2. CI usava Actions v4 e o runner emitia aviso de runtime antigo.
3. `npm ci` reportava vulnerabilidades moderadas, mas não existia gate específico para dependências de produção.
4. Smoke real não validava headers de segurança, fronteira Admin, aliases removidos nem service worker.
5. documentação de produção ainda descrevia cadastro público, planos, créditos, Mercado Pago, cron antigo e identidade Froc.IA.

## Correções R6

Todos os cinco pontos acima são tratados neste pacote.

## Limite técnico do comitê

O repositório não consegue provar sozinho:

- revogação de uma chave antiga no Google Cloud IAM;
- aprovação de apps OAuth em painéis de terceiros;
- presença de credenciais externas que não devem ser expostas;
- publicação real em conta social sem causar efeito externo.

Esses itens são declarados explicitamente como externos em vez de receber “sucesso” fictício.

## Decisão de produção

O código web atual não apresentou nova falha funcional no comitê. O pacote R6 fecha inconsistências de identidade/configuração, eleva o gate de segurança e reforça a prova pós-merge.

**Não declarar segurança 100% fechada sem confirmar a revogação da antiga chave Firebase Admin.**
