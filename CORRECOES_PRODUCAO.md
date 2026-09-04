# Correções e comitê de produção — setembro de 2026

## Baseline confirmado antes do R6

Commit `main` auditado: `94f93ada8c9d7a69bdeed4d1442341c9ccb1add1`.

Validações já concluídas no GitHub Actions:

- TypeScript: aprovado;
- testes automatizados: **113/113 aprovados**;
- build do cliente: aprovado;
- build do servidor: aprovado;
- sintaxe do bundle do servidor: aprovada;
- Vercel: deploy aprovado;
- smoke real contra `https://portal-vip-brasil.vercel.app`: aprovado;
- Firestore em produção: healthy;
- cron nativo: configurado;
- Vitrine, Blog, sitemap, robots, PWA e IndexNow: aprovados.

## Correções do pacote R6

- corrige a identidade nativa do Capacitor para **Portal Vip Brasil**;
- define o identificador nativo do Portal como `com.portalvipbrasil.app`;
- atualiza GitHub Actions para `checkout@v5` e `setup-node@v5`;
- adiciona gate de `npm audit` para dependências de produção em severidade moderada ou superior;
- amplia o smoke pós-merge com CSP, HSTS, anti-framing, `nosniff`, no-cache da API, fronteira administrativa, aliases 404/noindex e service worker;
- adiciona testes de governança para impedir retorno de documentação comercial/legada;
- reescreve documentação de produção para refletir o produto atual, sem cadastro público, planos, créditos ou Mercado Pago;
- sincroniza cron, Node/npm, OAuth e fluxo mobile documentados com o código real.

## Ação externa de segurança que NÃO pode ser resolvida por código

Uma chave privada Firebase Admin esteve versionada no histórico antigo deste repositório.

**É obrigatório confirmar no Google Cloud IAM que essa chave antiga foi revogada/excluída.**

Remover o segredo do código e trocar a variável na Vercel não revoga automaticamente a credencial histórica. O estado “100% fechado em segurança” só pode ser declarado depois dessa confirmação externa.

Passos:

1. Google Cloud Console → IAM e administrador → Contas de serviço.
2. Abra a conta usada pelo Firebase Admin.
3. Em **Chaves**, confirme que a chave antiga exposta não existe mais.
4. Mantenha apenas uma credencial válida/rotacionada.
5. Configure a chave atual somente na Vercel como `FIREBASE_ADMIN_PRIVATE_KEY`.
6. Nunca envie JSON de service account ao GitHub.

## Integrações externas

O código implementa e testa OAuth, isolamento, refresh e publicação por provedor. A disponibilidade real de cada rede ainda depende das credenciais, permissões, revisão do aplicativo e autorização da conta no respectivo provedor. Isso não pode ser falsificado por teste unitário.

## Regra de merge

Não faça merge se o novo **Typecheck, Test & Build Gate** falhar. O CI agora também bloqueia dependências de produção com vulnerabilidades moderadas ou superiores.

Após o merge, o **Production Smoke After Merge** valida automaticamente a produção real. Não é necessário repetir manualmente os mesmos testes locais.
