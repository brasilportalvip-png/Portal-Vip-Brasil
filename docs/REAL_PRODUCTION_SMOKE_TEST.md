# Portal Vip Brasil — smoke real de produção

## Automático

Arquivo: `test/productionSmoke.mjs`

Executado pelo GitHub Actions após push/merge em `main`.

Produção:

`https://portal-vip-brasil.vercel.app`

O smoke atual valida:

- release esperada em `/api/health`;
- Firestore `healthy`;
- `CRON_SECRET` configurado;
- cron nativo Vercel e agenda `0 13 * * *`;
- timezone `America/Sao_Paulo`;
- API com `Cache-Control: no-store`;
- Home 200;
- CSP;
- HSTS;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- Referrer Policy;
- endpoint Admin sem token bloqueado;
- `/alma` e `/creditos` como 404/noindex;
- API dinâmica de projetos;
- Vitrine;
- página individual de projeto com canonical/JSON-LD;
- Blog e página individual de artigo;
- sitemap;
- robots;
- manifest PWA;
- service worker e política de cache;
- IndexNow key.

O smoke não publica conteúdo real em contas sociais e não executa ações destrutivas.

## Validações externas que não devem ser fingidas

Quando um provedor for realmente habilitado, valide uma vez com a conta oficial:

- login administrativo do proprietário;
- autorização OAuth;
- seleção da página/canal correto;
- publicação real no provedor que será usado;
- refresh/reconexão quando aplicável;
- permissões aprovadas no console do provedor.

Essas ações dependem das contas externas e podem ter efeito público; por isso não pertencem ao smoke automático pós-merge.

## Firebase Admin histórico

Também é externa a confirmação de que a chave Firebase Admin antiga, anteriormente exposta no histórico, foi revogada no Google Cloud IAM.

## Regra prática

Se **Quality Gate**, **Production dependency audit**, **Vercel** e **Production Smoke After Merge** estiverem verdes, não repita os mesmos testes manualmente.

Só valide manualmente aquilo que depende de uma conta/credencial externa e ainda não foi comprovado.
