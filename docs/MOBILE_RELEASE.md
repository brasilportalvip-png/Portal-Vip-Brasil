# Portal Vip Brasil — Android / PWA / iOS readiness

A identidade nativa deste repositório é:

- App Name: `Portal Vip Brasil`
- Android/Application ID: `com.portalvipbrasil.app`
- Web directory: `dist`
- Android scheme: HTTPS
- Mixed content: desabilitado

## Build base

```bash
npm ci
npm run build
npm run android:add
npm run cap:sync
npm run android:open
```

O Android Studio abrirá o projeto nativo gerado pelo Capacitor.

## Backend

O app mobile usa o mesmo backend oficial:

`https://portal-vip-brasil.vercel.app`

Quando necessário, configure `VITE_API_BASE_URL` para a URL oficial antes do build.

## Segredos

Nunca coloque no APK/AAB:

- Firebase Admin private key;
- Gemini API keys;
- OAuth client secrets;
- `TOKEN_ENCRYPTION_KEY`;
- `CRON_SECRET`;
- `ADMIN_BOOTSTRAP_KEY`.

`VITE_FIREBASE_*` é a configuração pública esperada do Firebase Web SDK; credenciais Admin continuam exclusivas do servidor.

## Firebase Authentication nativo

`capacitor.config.ts` mantém o plugin Firebase Authentication habilitado. Qualquer provider nativo usado precisa ser configurado também no Firebase/Google Cloud para o pacote `com.portalvipbrasil.app`.

## Assinatura Android

Antes de publicar:

1. gere/use o keystore definitivo;
2. guarde o keystore fora do GitHub;
3. configure SHA-256 no Firebase quando o provider exigir;
4. gere AAB assinado;
5. teste login e chamadas ao backend em dispositivo real.

## App Links / Universal Links

Não publique `assetlinks.json` ou `apple-app-site-association` com dados inventados.

Só configure quando existirem:

- certificado Android definitivo + SHA-256;
- package ID definitivo;
- Team ID / Bundle ID iOS definitivos;
- domínios verificados.

## PWA

O PWA web já usa:

- `manifest.webmanifest`;
- service worker;
- ícones 192/512;
- `start_url=/`;
- `scope=/`;
- identidade Portal Vip Brasil.

O smoke pós-merge verifica manifesto e service worker na produção.
