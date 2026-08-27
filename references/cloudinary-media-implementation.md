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

O tenant possui `pwaIconAssetId`, `pwaIcon192Url`, `pwaIcon512Url` e `pwaIconSource`. O contrato é reversível e tem a seguinte precedência: **ícone personalizado ativo** (`pwaIconAssetId` preenchido) > **ícone derivado da logo** (`pwaIconSource=derived`) > **fallback físico do PWA**. O asset manual nunca é excluído ao restaurar a logo.

A finalidade `tenant_pwa_icon` é administrativa e usa o endpoint comum de mídia. Com Cloudinary ativo, um upload manual gera derivados PNG 192x192 e 512x512 com `crop: fill`; quando a logo é a fonte, o servidor gera os mesmos tamanhos sem novo upload, com `crop: pad`, centralização, fundo na cor primária e preservação das extremidades da marca. O original institucional permanece intacto.

O upload da logo atualiza automaticamente os derivados apenas quando não existe ícone personalizado. Salvar uma nova cor primária recalcula o fundo do derivado da logo; não altera ícone personalizado. A mutation administrativa “Usar logo como ícone” limpa somente a referência ativa do ícone manual e aponta novamente para os derivados mais recentes da logo.

O upload sincroniza o `faviconUrl` do tema público e atualiza o head em todas as rotas relevantes: página pública, Visite-nos, Portal do Visitante, login por subdomínio e painel autenticado. O manifest dinâmico e os endpoints `/api/pwa/icon-192.png` e `/api/pwa/icon-512.png` resolvem a igreja pelo host público ou por slug validado do painel. Ícones e atalhos recebem `?tenant=<slug>&v=<updatedAt>` para invalidar cache quando a logo, cores ou fonte efetiva mudarem. O service worker foi versionado para `ide-fazei-v5` e as notificações usam o endpoint 192x192 correto.

A produção já está com as migrações aplicadas e `MEDIA_PROVIDER=cloudinary` ativo. Novos uploads de identidade, ícone PWA, galeria, certificados e vídeos públicos usarão o Cloudinary conforme suas finalidades e permissões; comprovantes financeiros continuam protegidos no storage privado atual.

## Correção de propagação e entrega otimizada

A atualização da Identidade Visual do tenant agora ocorre em transação: `churches`, `tenant_themes` e a revisão pública publicada do mesmo tenant são sincronizados quando cores ou logo são alterados. O frontend invalida as consultas do painel, da prévia pública e da experiência pública após salvar, evitando estado antigo na sidebar, no PWA e no site.

Imagens Cloudinary passam a retornar `optimizedUrl`, `webpUrl` e `avifUrl`. O `optimizedUrl` usa negociação automática de formato e qualidade (`f_auto,q_auto:good`); os links WebP e AVIF ficam disponíveis para consumidores que desejarem seleção explícita. O asset original permanece registrado no banco para auditoria e gerenciamento.

Logo do tenant, galeria pública, logo de certificados e imagens de Avisos Públicos agora persistem a URL otimizada na experiência consumida pelo visitante. Vídeos e comprovantes financeiros não são convertidos por este fluxo: vídeos mantêm `resource_type=video` e comprovantes continuam no storage privado.
