# Portal Vip Brasil — Production Remediation Tracker

Data do comitê: 2026-09-04

| Área | Estado | Evidência / ação |
|---|---|---|
| TypeScript | FECHADO | baseline 113/113 + typecheck verde |
| Build cliente | FECHADO | GitHub Actions verde |
| Build servidor | FECHADO | GitHub Actions verde |
| Deploy Vercel | FECHADO | status success |
| Firestore produção | FECHADO | smoke: healthy |
| Cron | FECHADO | nativo Vercel, `0 13 * * *`, secret configurado |
| Auth administrativa | FECHADO NO CÓDIGO | Firebase Admin + custom claims/e-mail proprietário |
| Cadastro público | REMOVIDO | interface atual é acesso administrativo |
| Planos/créditos/pagamentos | REMOVIDO | não fazem parte da arquitetura atual |
| Vitrine dinâmica | FECHADO | API + SSR/SEO + smoke |
| Blog público | FECHADO | contrato público, draft privado, SEO + smoke |
| Projetos dinâmicos | FECHADO | criação/pausa/reativação/exclusão testadas |
| Scheduler | FECHADO | locks, recuperação e run-now Admin testados |
| Social OAuth | FECHADO NO CÓDIGO | state, isolamento, refresh, sanitização testados |
| Social contas reais | EXTERNO | depende de autorização/permissões de cada provedor |
| SSRF | FECHADO | analisador restringe destinos privados |
| Firestore Rules | FECHADO | auditoria estrutural automatizada |
| Storage Rules | FECHADO | escrita de cliente bloqueada |
| PWA/SEO/IndexNow | FECHADO | smoke real |
| Headers de segurança | FECHADO + R6 | smoke R6 passa a validar em produção |
| Dependências produção | GATE R6 | `npm audit --omit=dev --audit-level=moderate` bloqueia merge |
| CI Actions | CORRIGIDO R6 | `checkout@v5` / `setup-node@v5` |
| Identidade Capacitor | CORRIGIDO R6 | Portal Vip Brasil / `com.portalvipbrasil.app` |
| Documentação | CORRIGIDO R6 | removidos fluxos Froc legado, Mercado Pago, planos/créditos |
| Chave Firebase Admin antiga | **AÇÃO EXTERNA OBRIGATÓRIA** | confirmar revogação no Google Cloud IAM |

## Critério para “100% pronto”

### Código/repositório

Pode ser considerado fechado quando o PR R6 estiver com:

- Production dependency audit verde;
- Typecheck, Test & Build Gate verde;
- Vercel verde.

### Produção

Pode ser considerada validada quando, após merge:

- Production Smoke After Merge estiver verde;
- login administrativo oficial estiver operacional.

### Segurança externa

Só pode ser chamada de 100% fechada após confirmar que a antiga chave Firebase Admin exposta foi revogada.

### Integrações de terceiros

Cada rede só deve ser anunciada como operacional quando o app/projeto do provedor estiver aprovado e a conta oficial tiver sido conectada. O código não deve simular sucesso quando uma rede não estiver disponível.
