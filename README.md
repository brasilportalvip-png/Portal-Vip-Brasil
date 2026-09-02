# Portal Vip Brasil

> **Central Particular de Marketing Digital Automatizado, Vitrine de Aplicativos e Hub de Projetos Próprios.**

O **Portal Vip Brasil** é uma plataforma privada e unificada voltada para gestão, divulgação inteligente, criação contínua de conteúdo, SEO técnico e publicação multicanal automática para o ecossistema de sites e aplicativos próprios.

---

## 🌟 Visão Geral

- **Vitrine Pública Premium**: Apresentação de alto padrão dos sites e aplicativos móveis (Google Play Store), com links diretos, capturas de tela e páginas individuais indexáveis.
- **Motor de Inteligência Artificial Centralizado**: Esteira de IA com modelo primário, fallbacks automáticos, proteção contra alucinações baseada em fatos estruturados dos projetos e resiliência com anti-queda.
- **Automação Diária de Marketing**: Ciclo contínuo que analisa diariamente cada projeto ativo, gera campanhas contextuais sem repetição, adapta o material para múltiplas redes sociais e dispara publicações oficiais.
- **Blog Automático & Tráfego Orgânico**: Motor que produz diariamente 1 artigo inédito e profundo por projeto ativo com SEO técnico (JSON-LD Schema.org `BlogPosting` / `FAQPage`, metadados OpenGraph, Canonical) e notificação instantânea via protocolo **IndexNow** para Bing e buscadores.
- **Analisador de Sites por URL com Proteção SSRF**: Cadastro simplificado de novos projetos com extração inteligente de metadados públicos e sugestões automáticas da IA.
- **Painel Administrativo Privado**: Central com métricas, status real de conexões sociais, agendador, histórico auditável de campanhas, biblioteca de mídia e disparo manual imediato (*Executar Ciclo Agora*).

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ ou 20+
- NPM ou PNPM

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```
O servidor será iniciado na porta `3000` (ou porta configurada no ambiente), integrando frontend React/Vite com backend Express em modo unificado.

### Build de Produção
```bash
npm run build
npm start
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Copie o arquivo de exemplo e preencha com suas credenciais:
```bash
cp .env.example .env
```

Principais chaves:
- `GEMINI_API_KEY`: Chave de API do Google Gemini (mantida exclusivamente no backend).
- `GEMINI_MODEL_TEXT`: Modelo primário de geração de texto/campanhas (ex: `gemini-2.5-flash` ou `gemini-1.5-flash`).
- `GEMINI_MODEL_FALLBACK`: Modelo secundário para esteira de resiliência.
- `VITE_APP_URL`: URL canônica pública do Portal Vip Brasil.
- `FIREBASE_ADMIN_*`: Credenciais de persistência Firestore / Firebase Admin.
- `META_APP_ID`, `META_APP_SECRET`: Credenciais para publicação no Facebook e Instagram Graph API.
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: Integração oficial LinkedIn.
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`: Integração oficial TikTok.
- `TOKEN_ENCRYPTION_KEY`: Chave para criptografia de tokens OAuth no banco de dados.

---

## 📱 Projetos Iniciais Integrados

1. **Magia das Crenças** — [Site Oficial](https://www.magiadascrencas.com.br/) | [App Google Play](https://play.google.com/store/apps/details?id=com.magiadascrencas.app)
2. **Exu Responde** — [Site Oficial](https://exu-responde.vercel.app/) | [App Google Play](https://play.google.com/store/apps/details?id=com.portalvipbrasil.exuresponde)
3. **Maria Padilha Rainha** — [Site Oficial](https://maria-padilha-rainha-das-7-encruzil.vercel.app/) | [App Google Play](https://play.google.com/store/apps/details?id=com.portalvipbrasil.mariapadilharainha)
4. **Manual Católico** — [Site Oficial](https://manual-cat-lico.vercel.app/) | [App Google Play](https://play.google.com/store/apps/details?id=br.com.manualcatolico.app)
5. **Frocia** — [Site Oficial](https://frocia2.vercel.app/)
6. **Oráculos** — [Site Oficial](https://oraculos-ts.vercel.app/)
7. **Froc IA Marketing Engine** — [Site Oficial](https://froc-ia-marketing-engine.vercel.app/)

---

## 🔒 Segurança e Resiliência
- **Zero Secrets Expostos**: Chaves e tokens residem exclusivamente no servidor.
- **Proteção SSRF**: O extrator de URLs valida e rejeita conexões para `localhost`, endereços IP privados (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), metadados de nuvem e esquemas não-HTTP.
- **Esteira com Fallbacks**: Em caso de oscilações na API de IA, o sistema executa retries com backoff e troca para modelo de contingência sem interromper a navegação da vitrine ou o login administrativo.
- **Idempotência de Publicação**: Bloqueios e hashes de conteúdo evitam republicações repetidas no mesmo dia.
