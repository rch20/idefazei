# Achados técnicos sobre ícones PWA

## Fontes oficiais consultadas

1. MDN, [Web App Manifest — icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons): o manifesto aceita múltiplos objetos em `icons`, cada um com `src`, `sizes`, `type` e `purpose`; `sizes` deve declarar o tamanho raster exato; `purpose` pode ser `any`, `maskable` ou `monochrome`. Ícones `maskable` devem reservar uma zona segura central.

2. web.dev, [Web app manifest](https://web.dev/learn/pwa/web-app-manifest): o manifest deve ser vinculado em todas as páginas instaláveis; se apenas um tamanho for entregue, 512x512 é a escolha recomendada, mas 192x192 e outros tamanhos são recomendados para melhor compatibilidade. Ícones quadrados sem transparência inesperada tendem a ser mais compatíveis; o manifest pode declarar ícones `any maskable`.

3. Apple Developer, [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html): iOS usa `apple-touch-icon`; múltiplos tamanhos podem ser declarados com `sizes`, incluindo 180x180 para iPhone Retina, 167x167 para iPad Retina e 152x152 para iPad. Para o requisito do Ide Fazei, o contrato adotará 192x192 como ícone solicitado pelo usuário para iOS, além do 512x512 do PWA.

## Decisão para o Ide Fazei

O upload único do ícone PWA do tenant ficará registrado como `tenant_pwa_icon`. O servidor Cloudinary gerará URLs transformadas PNG em 192x192 e 512x512, armazenadas no tenant como `pwaIcon192Url` e `pwaIcon512Url`, com `pwaIconAssetId` ligando o tenant ao registro de `media_assets`. A URL 192x192 será utilizada no favicon, Apple Touch Icon, atalhos e notificações; a 512x512 será utilizada pelo manifest para instalação em dispositivos que exigem maior resolução.

O manifest e os ícones serão resolvidos server-side por host público do tenant ou por `?tenant=slug` no painel autenticado. A página pública, o login por subdomínio e o layout autenticado atualizarão dinamicamente `<title>`, favicon, Apple Touch Icon, manifest e `theme-color`. O service worker terá cache versionado e utilizará `/api/pwa/icon-192.png` nas notificações, evitando o caminho inexistente anterior `/icon-192.png`.
