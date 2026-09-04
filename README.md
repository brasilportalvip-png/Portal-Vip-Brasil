# Portal Vip Brasil

> Central privada de projetos, automação de marketing, conteúdo, SEO, Vitrine e conexões sociais do ecossistema Portal Vip Brasil.

Produção oficial: **https://portal-vip-brasil.vercel.app**

## Arquitetura atual

- **Vitrine pública dinâmica** com páginas individuais `/vitrine/:slug`, canonical, JSON-LD e sitemap.
- **Blog público** com artigos publicados, páginas `/blog/:slug`, Schema.org, Open Graph e IndexNow.
- **Painel administrativo privado**: não existe cadastro público; o acesso administrativo é validado por Firebase Auth + Firebase Admin/custom claims.
- **Projetos dinâmicos**: os sete projetos iniciais são seeds; novos projetos podem ser administrados sem alterar um array fixo no frontend.
- **Automação diária** via scheduler/cron oficial.
- **IA no backend** com Gemini, fallback e regras de grounding.
- **Redes sociais** com OAuth por projeto. Publicação textual automática é restrita aos provedores cujo contrato suporta texto no fluxo atual; redes orientadas a mídia usam fluxos específicos.
- **Firestore** com escrita pelo backend e regras de cliente fail-closed.
- **PWA** com manifesto, service worker e headers de segurança.

## Requisitos

- **Node.js 22.x**
- **npm 10.x**

Os mesmos requisitos estão declarados em `package.json` e usados no CI.

## Instalação local

```bash
npm ci
npm run dev
```

## Quality Gate

```bash
npm run check
```

O gate executa TypeScript, testes automatizados, build do cliente, build do servidor e validação sintática do bundle.

No GitHub Actions também existe auditoria das **dependências de produção** e smoke test automático contra o deploy real após merge no `main`.

## Build de produção

```bash
npm run build
npm start
```

## Variáveis de produção

Use `.env.example` como contrato. As principais variáveis privadas são:

- `APP_URL`
- `PORTAL_ADMIN_EMAILS`
- `CRON_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MEDIA_API_KEY`
- credenciais OAuth somente dos provedores realmente habilitados

As variáveis `VITE_FIREBASE_*` são configuração pública do SDK web do Firebase e não substituem as credenciais Firebase Admin.

## Projetos iniciais

O Portal possui sete projetos seedados inicialmente, mas a Vitrine, o Blog, a Biblioteca e o painel administrativo trabalham com o registro dinâmico persistido:

1. Magia das Crenças
2. Exu Responde
3. Maria Padilha Rainha das 7 Encruzilhadas
4. Manual Católico
5. Froc IA
6. Oráculos
7. Froc IA Marketing Engine

## Segurança

- Firebase Admin e segredos OAuth ficam exclusivamente no backend.
- Tokens sociais persistidos são criptografados.
- Rotas administrativas exigem autenticação e privilégio administrativo.
- CORS é restrito em produção.
- Rate limiting persistente opera em fail-closed.
- CSP, HSTS, `nosniff`, anti-framing, Referrer Policy e Permissions Policy são aplicados em produção.
- O analisador de URL possui proteção SSRF.
- Rascunhos do Blog não são públicos.
- Aliases comerciais/legados e `/alma` público respondem 404 real/noindex.
- O cron exige `CRON_SECRET`.
- Firestore e Storage não permitem escrita direta pelo cliente.

## Produção validada

O baseline anterior ao pacote R6 passou **113/113 testes**, build cliente/servidor e smoke real de produção. O smoke pós-merge verifica release, Firestore, cron, rotas públicas, SEO, PWA e IndexNow; o pacote R6 amplia esse smoke com headers de segurança, fronteira administrativa, service worker e aliases bloqueados.

Consulte:
- `CORRECOES_PRODUCAO.md`
- `docs/PRODUCTION_SETUP.md`
- `docs/PRODUCTION_E2E_CHECKLIST.md`
- `docs/REAL_PRODUCTION_SMOKE_TEST.md`
- `docs/PRODUCTION_REMEDIATION_TRACKER.md`
