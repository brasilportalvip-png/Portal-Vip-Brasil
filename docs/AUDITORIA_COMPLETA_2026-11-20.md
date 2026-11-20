# Auditoria completa de ponta a ponta — 20/11/2026

Escopo: os 241 arquivos do repositório (cerca de 49 mil linhas), incluindo servidor, rotas, autenticação, regras do Firebase, configuração da Vercel, cliente React (visitante e administrador), SEO/SSR, além de verificação no site em produção (`https://portal-vip-brasil.vercel.app`).

Método:
- leitura dos fluxos críticos;
- cruzamento automático de **todas as 97 chamadas de API do cliente** com as rotas do servidor (nenhuma chamada órfã);
- conferência de cada destino de navegação dos menus;
- checagem de timers e listeners;
- testes antes e depois de cada correção.

Todas as correções foram aplicadas **de uma vez**, num único commit.

## Erros encontrados e corrigidos

| # | Área | Problema | Correção |
|---|------|----------|----------|
| 1 | Segurança (servidor) | O e-mail do proprietário em `PORTAL_ADMIN_EMAILS` virava admin **sem checar `email_verified`**. Uma conta criada com esse endereço, sem verificar o e-mail, ganharia acesso total. | Agora só vale com `email_verified === true`. Quem já tem custom claim de admin continua com acesso. |
| 2 | Painel / Campanhas / Analytics / Calendário | Campanhas e agendamentos **nunca eram carregados** após o login. O Painel mostrava 0 campanhas ativas, 0 na fila e 0 publicados no mês. A tela Campanhas e o Calendário apareciam vazios até alguma ação manual. | Os dados carregam ao confirmar a sessão e são atualizados ao abrir cada tela. |
| 3 | Calendário | O horário sugerido usava UTC no campo de hora local: aparecia 2 horas no passado no Brasil e agendava no passado. | Usa a data e hora locais do aparelho. |
| 4 | Calendário | Posts agendados entre 21h e 23h59 apareciam no **dia seguinte** da grade, porque a data era comparada em UTC. | Agrupa os posts pelo dia local. |
| 5 | Calendário | O seletor de conteúdo ficava vazio se a Biblioteca não tivesse sido aberta antes. | Abrir o Calendário já carrega os conteúdos. |
| 6 | Calendário | Data vazia gerava um erro técnico (`RangeError`). Os botões de ação levavam a telas inexistentes ("planos", "empresa") e caíam na tela inicial. | Validação clara da data. Os botões levam para "Projetos" e "Redes Sociais". |
| 7 | Campanhas | A data inicial padrão usava UTC (depois das 21h, mostrava o dia seguinte). | Usa a data local. |
| 8 | Sessão | Ao abrir um link privado (por exemplo `/calendario`), a tela inicial piscava antes da página, e quem não estava logado via a home sem pedido de login. | Mostra "Carregando o painel…" e, sem sessão, abre o login e depois volta para a tela pedida. |
| 9 | Sessão | Uma conta sem permissão ou com sessão expirada ficava "meio logada" a cada recarga. | Encerra o login do Firebase quando a API responde 401 ou 403. |
| 10 | Rede / app Android | O CORS não liberava o cabeçalho `X-Froc-Visitor` nem expunha `X-Froc-Audio-Sample-Rate`, então o Froc falhava no app Capacitor (origem diferente). | Cabeçalhos liberados. |
| 11 | Segurança | Cinco rotas de cron comparavam o segredo com `===`, e o mesmo valia para a chave de bootstrap do administrador (sujeito a ataque de temporização). | Comparação em tempo constante (`timingSafeEqual`) em todas. |
| 12 | SEO (produção) | Em `/vitrine`, o HTML vinha **sem nenhum projeto** (só "precisa de JavaScript"). `/vitrine/:slug` também vinha sem conteúdo e com `og:image` relativa. | HTML pré-renderizado com a lista de projetos, ItemList e breadcrumb no schema, página de cada projeto com destaques e links oficiais, e `og:image` absoluta. |
| 13 | Páginas privadas | O ícone apontava para `/favicon.svg`, que não existe (erro 404). | Usa `/icons/icon-192.png`. |
| 14 | Rotas | `/agentes` existia no app, mas não estava nas rotas privadas do servidor nem da Vercel (ficava sem `noindex`). | Incluída nas duas. |
| 15 | Mensagens | O aviso de tempo limite dizia sempre "240s", mesmo em chamadas de 12s. Páginas HTML de erro 502/504 da plataforma podiam aparecer como texto bruto. | A mensagem mostra o tempo real, e o HTML de erro vira uma mensagem amigável. |
| 16 | Login | Erros de rede, e-mail inválido e conta desativada mostravam mensagens técnicas. | Mensagens claras em português. |
| 17 | Admin | Se uma única seção falhasse, o painel inteiro ficava vazio. Arquivar um artigo não pedia confirmação. | Cada seção carrega de forma independente e o erro diz qual seção falhou. Arquivar pede confirmação. |

## Verificação executada

- Bundle do servidor (`server.ts`), da função Vercel (`api/index.ts`) e do cliente (`src/main.tsx`) com esbuild: **ok**.
- `vercel.json`: JSON válido.
- Checagem de tipos completa: **nenhum erro novo** em relação à versão anterior.
- Testes automatizados: **38 de 50 arquivos executados, 265 testes aprovados e 0 falhas**, incluindo os 13 testes novos em `test/auditoriaCompleta2026_11.test.ts`. O resultado é idêntico ao da versão anterior, mais os testes novos.
  - Os outros 13 arquivos sobem um servidor Express real e rodam no gate do instalador e no CI do GitHub (`npm ci`, `typecheck`, `test` e `build`).
- SSR renderizado de verdade: `/vitrine` → 200, com os projetos; `/vitrine/magia-das-crencas` → 200, com conteúdo e `og:image` absoluta; projeto inexistente → 404.

## Ações externas (não se resolvem por código)

1. **Chave antiga do Firebase Admin**: confirme no Google Cloud IAM que a chave exposta no histórico foi excluída. Esse item já estava pendente nos comitês anteriores.
2. **Login do proprietário**: com a correção nº 1, se algum dia aparecer "Acesso restrito", use **"Esqueci minha senha"** no login. Ao redefinir a senha pelo link do e-mail, o Firebase marca o e-mail como verificado. A sessão atual não é afetada, porque as custom claims de admin já foram gravadas pelo auto-reparo.
3. **Conteúdo do blog**: há artigos com temas muito parecidos, por exemplo dois títulos "Como Abrir Caminhos Espirituais: …" e vários sobre "caça fantasma". Não é um defeito de código, mas vale arquivar os repetidos pelo painel Admin para evitar canibalização no Google.
