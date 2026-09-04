# Portal Vip Brasil — configuração externa de produção

Produção oficial: `https://portal-vip-brasil.vercel.app`

Este documento descreve apenas a arquitetura atual. O Portal não possui cadastro público, planos, carteira de créditos ou integração Mercado Pago.

## 1. Firebase

### Authentication

- Habilite **E-mail/Senha** para o login administrativo atual.
- Cadastre o e-mail proprietário em `PORTAL_ADMIN_EMAILS`.
- O backend valida o ID token com Firebase Admin e revogação habilitada.
- O privilégio administrativo vem de custom claims e/ou do e-mail proprietário configurado.
- `ADMIN_BOOTSTRAP_ENABLED` deve permanecer `false` após a configuração inicial.

### Firestore

- Use banco de produção.
- Publique `firestore.rules`.
- Publique `firestore.indexes.json`.
- O cliente não recebe permissão de escrita direta nas coleções operacionais.

### Storage

- Publique `storage.rules`.
- O acesso de escrita do cliente permanece bloqueado; operações privilegiadas usam backend/Admin SDK.

### Credencial Firebase Admin

Configure somente no ambiente de servidor:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

**Segurança obrigatória:** confirme no Google Cloud IAM que qualquer chave Firebase Admin que tenha aparecido no histórico antigo do GitHub foi revogada.

## 2. Vercel

Configuração esperada:

- Install Command: `npm ci`
- Build Command: `npm run build`
- Output: `dist`
- Node: 22.x
- npm: 10.x

O `vercel.json` controla API, SSR público, headers, cache, SPA e cron.

### Cron oficial

Endpoint:

`GET /api/cron/process`

Agenda:

`0 13 * * *`

Timezone operacional:

`America/Sao_Paulo`

O endpoint exige:

`Authorization: Bearer <CRON_SECRET>`

Não exponha `CRON_SECRET` no frontend.

## 3. Variáveis obrigatórias

Consulte `.env.example`. Em produção, o backend exige os contratos críticos, incluindo:

- `APP_URL=https://portal-vip-brasil.vercel.app`
- `PORTAL_ADMIN_EMAILS`
- `CRON_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MEDIA_API_KEY`
- `INDEXNOW_KEY`

As variáveis `VITE_FIREBASE_*` são configuração pública do Firebase Web SDK.

## 4. Gemini

Modelos padrão do projeto são definidos no backend e podem ser sobrescritos por ambiente.

O comitê confirmou compatibilidade da família configurada de texto, imagem e Veo com a documentação atual do Google em setembro de 2026.

Nunca coloque chave Gemini em variável `VITE_*`.

## 5. OAuth social

Configure apenas os provedores realmente usados. Cada par `CLIENT_ID/SECRET` deve estar completo.

Callbacks seguem:

`https://portal-vip-brasil.vercel.app/api/social/<provider>/callback`

### Matriz atual

| Provedor | OAuth | Texto direto no motor atual | Mídia/fluxo específico | Observação |
|---|---|---:|---:|---|
| Facebook Page | sim | sim | limitado | requer Page Access Token/permissões aprovadas |
| LinkedIn | sim | sim | limitado | requer `w_member_social` aprovado |
| X | sim, PKCE | sim | limitado | requer permissão de escrita |
| Instagram Professional | sim | não | sim/específico | publicação exige mídia |
| YouTube | sim | não | sim/específico | upload de vídeo |
| TikTok | sim, PKCE | não | draft/upload | escopos atuais: `user.info.basic`, `video.upload` |
| Pinterest | sim | não | sim/específico | pins exigem conteúdo visual |

As aprovações de Meta/Google/LinkedIn/TikTok/Pinterest/X são externas ao repositório.

## 6. GitHub / CI

O workflow `.github/workflows/ci.yml` executa:

1. `npm ci`
2. `npm audit --omit=dev --audit-level=moderate`
3. `npm run check`
4. após merge no `main`, smoke contra a produção real

Proteja `main` exigindo o status **Typecheck, Test & Build Gate** antes do merge.

## 7. Go-live

Antes de declarar segurança 100%:

- CI do PR verde;
- Vercel verde;
- smoke pós-merge verde;
- Firebase Admin key histórica revogada;
- credenciais de produção presentes apenas na Vercel;
- `ADMIN_BOOTSTRAP_ENABLED=false`;
- cada provedor social que será usado realmente autorizado no painel externo;
- e-mail proprietário consegue efetuar login administrativo.

Não repita manualmente testes que o CI e o smoke já executaram com sucesso.
