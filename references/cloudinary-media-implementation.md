# Integração de mídia com Cloudinary

## Estado desta etapa

A infraestrutura está preparada, sem credenciais reais e sem chamadas externas ao Cloudinary durante os testes. O modo padrão continua usando o armazenamento atual para não interromper a produção enquanto a conta é configurada. Quando as três variáveis Cloudinary forem preenchidas, o modo `auto` passa a usar Cloudinary automaticamente nos uploads de identidade e mídia pública.

## Áreas já conectadas ao adaptador

| Área | Finalidade | Tipo | Autorização | Limite atual |
|---|---|---|---|---|
| Identidade do tenant | `tenant_logo` | Imagem | Pastor ou Secretário | 2 MB |
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

## Próxima etapa após as credenciais

Depois de receber as credenciais, validar a conta e a política de pastas, será necessário configurar as variáveis secretas na VPS, mudar o provider para `cloudinary`, executar um upload fictício controlado da logo do tenant, conferir resposta, `public_id`, registro em `media_assets`, URL HTTPS e substituição no painel. Só depois dessa evidência a migração deverá ser considerada ativa para produção.

## Evidência de validação

A preparação foi validada sem credenciais Cloudinary reais. O adaptador foi testado com o fallback do storage atual, os contratos de galeria e endpoint genérico foram verificados, o TypeScript passou, a suíte completa passou com 241 testes em 31 arquivos e o build de produção foi concluído. A migração 0036 foi gerada e revisada como aditiva; ela ainda deve ser aplicada na VPS junto com a configuração das variáveis quando a conta estiver pronta.
