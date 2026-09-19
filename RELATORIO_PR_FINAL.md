# Portal Vip Brasil — PR final após o merge #45

Base confirmada: `origin/main` no commit `689d9a8`, Merge Pull Request #45.

## Correções desta PR

- Exige e-mail verificado para conceder ou utilizar privilégios administrativos.
- Usa comparação criptográfica em tempo constante para o segredo de bootstrap.
- Remove origens localhost/Capacitor do CORS quando o servidor está em produção.
- Rejeita URLs públicas inválidas como `https://icons/logo.png` e aplica ativo oficial de fallback.
- Corrige a apresentação contraditória entre execução manual e último Vercel Cron.
- Exibe os erros específicos do último cron no painel administrativo.
- Adiciona foco inicial, retorno de foco, tecla Escape, trava de Tab e mensagens acessíveis ao login.
- Mantém geração automática paga de vídeo desligada.
- Mantém publicação direta de vídeo desligada até pós-produção e controle de qualidade.
- Exige no briefing: pessoa realista, demonstração do produto/site, marca oficial, texto verificado e CTA.
- Impede que o modelo generativo desenhe texto/logotipo incorreto; esses elementos precisam de pós-produção determinística e revisão.

## Validação concluída

- TypeScript aprovado.
- 206 testes aprovados.
- Build de produção aprovado.
- Auditoria de dependências: 0 vulnerabilidades.
- Patch aplicado sobre a `main` já atualizada pelo merge #45.

## Segurança financeira

Mantenha estas variáveis ausentes ou com valor `false` na Vercel:

```env
AUTO_PAID_VIDEO_GENERATION_ENABLED=false
VIDEO_DIRECT_AUTO_PUBLISH_ENABLED=false
```

Isso impede gasto automático e publicação direta de vídeos ainda não revisados.

