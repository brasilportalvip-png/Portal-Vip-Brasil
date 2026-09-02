# Correções de produção — setembro de 2026

## Ação externa obrigatória

A chave privada do Firebase Admin que esteve versionada deve ser revogada no
Google Cloud IAM. Crie uma credencial nova e configure-a somente na Vercel como
`FIREBASE_ADMIN_PRIVATE_KEY`. Remover a chave do código não revoga a credencial
antiga nem a elimina do histórico do GitHub.

## Alterações deste pacote

- remove a chave privada e todos os fallbacks de credenciais Firebase do código;
- exige as três variáveis Firebase Admin em produção;
- protege operações administrativas do Portal, blog e ALMA;
- impede leitura pública de rascunhos do blog;
- isola memórias ALMA por usuário e valida propriedade antes da exclusão;
- limita formato e tamanho de imagens enviadas ao ALMA Vision;
- limita verificações do Firestore a quatro segundos e reutiliza o resultado;
- limita consultas dinâmicas do sitemap a quatro segundos;
- corrige nome, descrição e entrada do PWA para Portal Vip Brasil;
- ignora artefatos compilados do servidor;
- sincroniza o lockfile e fixa o ambiente suportado em Node 22/npm 10;
- adiciona testes de regressão para rotas administrativas protegidas.

## Variáveis mínimas de produção

- `APP_URL`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `TOKEN_ENCRYPTION_KEY`
- `CRON_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MEDIA_API_KEY`
- todas as variáveis públicas `VITE_FIREBASE_*`

O bootstrap administrativo deve permanecer com
`ADMIN_BOOTSTRAP_ENABLED=false` após configurar os Custom Claims do
administrador.

## Validação executada

- TypeScript: aprovado;
- testes automatizados: 100 de 100 aprovados;
- build do cliente: aprovado;
- build do servidor: aprovado;
- sintaxe do bundle do servidor: aprovada;
- busca de chave privada no código distribuído: nenhuma ocorrência.

