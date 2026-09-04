# Portal Vip Brasil — checklist E2E de produção

Este roteiro substitui o checklist legado de cadastro público, planos, créditos e pagamentos.

## A. Público

1. **Home**
   - `/` responde 200 e identifica Portal Vip Brasil.
2. **Vitrine**
   - `/api/portal/projects` retorna projetos ativos.
   - `/api/vitrine` contém os projetos ativos.
   - `/vitrine/:slug` responde 200 com canonical e JSON-LD.
3. **Blog**
   - lista pública retorna somente conteúdo publicável.
   - `/blog/:slug` responde 200 com metadata de artigo.
   - rascunho não pode ser resolvido publicamente.
4. **SEO**
   - `/sitemap.xml` responde 200 e contém projetos dinâmicos.
   - `/robots.txt` aponta sitemap e bloqueia `/admin`.
   - IndexNow key responde no formato esperado.
5. **PWA**
   - `/manifest.webmanifest` e `/sw.js` respondem 200.
   - service worker não usa cache longo.

## B. Segurança

6. **Headers**
   - CSP, HSTS, `nosniff`, `X-Frame-Options`, Referrer Policy e Permissions Policy presentes.
7. **API sem cache**
   - `/api/*` possui `Cache-Control: no-store`.
8. **Admin**
   - endpoint administrativo sem token responde 401/403.
9. **Rotas removidas**
   - `/alma` público e aliases comerciais como `/creditos` respondem 404 real/noindex.
10. **Firestore/Storage**
   - regras de cliente permanecem fail-closed para escrita operacional.

## C. Acesso administrativo

11. **Login**
   - proprietário configurado autentica via Firebase.
   - backend `/api/auth/me` confirma privilégio administrativo.
   - não existe fluxo de cadastro público.
12. **Consentimento**
   - versão atual de termos/privacidade é exigida quando aplicável.
13. **Logout**
   - sessão cliente é encerrada e recursos privados voltam a exigir autenticação.

## D. Projetos

14. **Projetos dinâmicos**
   - criar projeto pelo Admin;
   - validar slug e página pública;
   - pausar/reativar;
   - projeto customizado pode ser excluído;
   - projetos seed permanecem protegidos contra exclusão permanente.
15. **Analisador de URL**
   - somente HTTP/HTTPS público;
   - localhost, rede privada e metadata cloud bloqueados por SSRF.

## E. Conteúdo e Blog

16. **IA**
   - geração usa o projeto atual e grounding;
   - falha externa não pode virar sucesso falso.
17. **Blog**
   - criação/automação respeita idempotência por projeto/data;
   - persistência Firestore precisa confirmar sucesso;
   - métricas iniciais não podem ser inventadas.
18. **Biblioteca**
   - conteúdo e ativos de marca refletem projetos dinâmicos.

## F. Scheduler e redes sociais

19. **Scheduler**
   - cron usa `CRON_SECRET`;
   - execução manual administrativa é protegida;
   - locks evitam duplicação;
   - agendamentos futuros permanecem intactos;
   - resultado externo incerto exige revisão em vez de sucesso falso.
20. **OAuth/social**
   - state tem expiração/anti-replay;
   - tokens não aparecem em respostas/logs públicos;
   - conexão é isolada por projeto;
   - refresh é aplicado quando suportado;
   - Facebook/LinkedIn/X podem publicar texto no fluxo automático atual;
   - redes orientadas a mídia seguem fluxo próprio;
   - TikTok usa `video.upload`, sem declarar `video.publish`.

## G. Mobile

21. **Capacitor**
   - `appName = Portal Vip Brasil`;
   - `appId = com.portalvipbrasil.app`;
   - `allowMixedContent=false`;
   - nenhum segredo de backend é empacotado no APK/AAB.

## H. Evidência automática

O CI executa testes automatizados e build. Após merge no `main`, `test/productionSmoke.mjs` testa a produção real.

A única parte que exige verificação humana externa é aquilo que o repositório não consegue consultar com segurança: revogação da chave Firebase histórica, aprovações OAuth dos provedores e credenciais/contas de terceiros.
