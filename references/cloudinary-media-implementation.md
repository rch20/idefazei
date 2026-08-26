# Integração de mídia com Cloudinary

## Estado desta etapa

A integração Cloudinary está ativa na VPS de produção. O runtime usa `MEDIA_PROVIDER=cloudinary`, com os três segredos armazenados somente em `/etc/ide-fazei/runtime` com permissão `root:idefazei 600`. Nenhum segredo foi commitado ou incluído no frontend. O backup pré-ativação foi validado e permanece disponível para rollback.

## Áreas já conectadas ao adaptador

| Área | Finalidade | Tipo | Autorização | Limite atual |
|---|---|---|---|---|
| Identidade do tenant | `tenant_logo` | Imagem | Pastor ou Secretário | 2 MB |
| Ícone PWA do tenant | `tenant_pwa_icon` | Imagem | Pastor ou Secretário | 2 MB |
| Logo de certificados | `certificate_logo` | Imagem | Endpoint administrativo existente | 2 MB |
| Galeria da Página Pública | `tenant_public_gallery` | Imagem | Pastor | 4 MB |
| Próximos vídeos públicos | `public_video` | Vídeo | Pastor | 32 MB |

O endpoint legado `/api/upload` foi preservado para os consumidores atuais, mas agora passa pelo adaptador unificado e registra `media_assets`. O endpoint `/api/tenant-public-media` também usa o adaptador e devolve `mediaAssetId`. A galeria passa a validar a propriedade pelo `churchId`, finalidade e status ativo do asset; a regra de prefixo `/manus-storage` continua como compatibilidade para itens antigos.

## Áreas deliberadamente protegidas

Comprovantes da Tesouraria podem ser imagens, mas são documentos financeiros sensíveis e o fluxo atual os entrega por URL privada do storage da aplicação. Eles não serão enviados como assets públicos do Cloudinary. A migração dessa área exige primeiro configurar upload `private`/`authenticated` e URLs temporárias assinadas no servidor, para não expor comprovantes. PDFs continuam no storage atual até essa etapa ser implementada e testada.

Campos como miniaturas ou imagens fornecidas por URL externa, sem seletor de arquivo no sistema, não foram convertidos automaticamente. Eles devem passar pelo adaptador quando ganharem upload próprio, mantendo o contrato de origem e propriedade do tenant.

## Organização Cloudinary

O adaptador usa pastas lógicas `idefazei/{churchId}/{purpose}` e salva o `publicId`, o provedor, o tipo de recurso, a finalidade, URL segura, tamanho, dimensões, duração, nome original e usuário que enviou. A tabela `media_assets` é multi-tenant e possui índices por igreja, finalidade e identificador do provedor.

O segredo nunca é importado pelo frontend. A configuração fica em `server/_core/env.ts` e aceita:

```text
MEDIA_PROVIDER=auto
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

`auto` usa Cloudinary quando as três credenciais existem; `manus_storage` mantém o storage atual; `cloudinary` exige as três credenciais e falha de forma explícita se alguma estiver ausente.

## Ativação em produção

As credenciais foram configuradas somente na VPS após backup integral do código, build, runtime e banco. As migrações aditivas `0036_tan_cerebro.sql` e `0037_superb_korg.sql` foram aplicadas com os separadores internos do Drizzle removidos de forma controlada. O backup validado está em `/opt/ide-fazei/backups/cloudinary-activation-deploy-20260826-144927`.

O teste controlado usou uma imagem PNG fictícia de 1×1 no tenant existente, confirmou upload no Cloudinary, `public_id` em `idefazei/1/tenant_pwa_icon/...`, registro multi-tenant, URLs transformadas 192/512 com HTTP 200 e sincronização dos campos do tenant. Ao final, o asset Cloudinary foi destruído, o registro de teste foi removido e os campos do tenant/tema retornaram a `NULL`.

## Evidência de validação

A preparação local foi validada com TypeScript, suíte completa de 245 testes em 31 arquivos e build de produção. Na VPS, o build do commit `33541e6` foi concluído, o serviço reiniciou como PID `33341`, a porta `127.0.0.1:3000` retornou HTTP 200, o domínio HTTPS retornou HTTP 200, o manifest declarou 192×192 e 512×512, as rotas de ícone responderam por fallback, o Nginx passou no teste e não surgiram erros críticos nos logs após o restart. O banco ativo possui a tabela `media_assets`, três colunas PWA no tenant e zero assets ativos após a limpeza do teste.

## Ícone PWA por tenant

O tenant agora possui `pwaIconAssetId`, `pwaIcon192Url` e `pwaIcon512Url`. A finalidade `tenant_pwa_icon` é administrativa e usa o endpoint comum de mídia. Com Cloudinary ativo, o servidor gera os derivados PNG 192x192 e 512x512 a partir do mesmo `public_id`, usando transformação quadrada; sem Cloudinary, o fallback atual permanece disponível até a ativação das credenciais.

O upload sincroniza o `faviconUrl` do tema público e atualiza o head em todas as rotas relevantes: página pública, Visite-nos, Portal do Visitante, login por subdomínio e painel autenticado. O manifest dinâmico e os endpoints `/api/pwa/icon-192.png` e `/api/pwa/icon-512.png` resolvem a igreja pelo host público ou por slug validado do painel. O service worker foi versionado para `ide-fazei-v5` e as notificações usam o endpoint 192x192 correto.

A produção já está com as migrações aplicadas e `MEDIA_PROVIDER=cloudinary` ativo. Novos uploads de identidade, ícone PWA, galeria, certificados e vídeos públicos usarão o Cloudinary conforme suas finalidades e permissões; comprovantes financeiros continuam protegidos no storage privado atual.
