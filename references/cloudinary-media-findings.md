# Achados de integração Cloudinary

Data da consulta: 2026-08-26.

## Fontes oficiais

1. [Node.js image and video upload](https://cloudinary.com/documentation/node_image_and_video_upload)
2. [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)

## Decisões técnicas

O SDK Node.js do Cloudinary suporta uploads assinados e não assinados. Para a aplicação multi-tenant, o fluxo recomendado é assinado: o servidor autentica a sessão, valida igreja, tipo e tamanho, gera a assinatura com timestamp e somente então o navegador envia o arquivo ao Cloudinary. O `api_secret` permanece exclusivamente no servidor e nunca deve chegar ao bundle do cliente.

O upload pode usar `upload_stream` para enviar o conteúdo recebido sem depender de arquivo persistido temporário. O `resource_type` distingue `image`, `video`, `raw` e `auto`; imagens e vídeos devem ser tratados explicitamente, evitando aceitar qualquer tipo por padrão. Para arquivos grandes ou redes instáveis, existem métodos chunked, mas os limites e a política por tipo devem ser definidos antes de habilitar esse caminho.

A resposta do Cloudinary fornece `secure_url`, `public_id`, `resource_type`, formato, bytes, dimensões e, quando aplicável, duração. O sistema deve persistir apenas o metadata necessário e o identificador do asset, vinculando-o ao `churchId`, finalidade e entidade de origem. URLs derivadas devem ser geradas pelo servidor ou armazenadas como `secure_url` controlada; operações administrativas como apagar ou substituir devem validar tenant e autorização.

A Upload API permite restringir formatos por `allowed_formats`, usar assinatura baseada em timestamp e definir `type` para upload público, privado ou autenticado. A aplicação deve começar com `type=upload` apenas para assets destinados a exibição pública e evitar arquivos sensíveis no mesmo fluxo. Para mídia protegida, o desenho deve usar entrega autenticada ou URL assinada em uma etapa específica, sem expor o asset diretamente.

## Escopo inicial

A primeira migração será a logo da Identidade Visual do tenant, substituindo o endpoint genérico local por um endpoint de mídia do servidor que valida a igreja e encaminha para Cloudinary. Depois devem usar o mesmo contrato a galeria da Página Pública, imagens de células e outros uploads identificados no código. Vídeos devem compartilhar o adaptador, mas com limites, formatos e processamento próprios.

## Credenciais necessárias posteriormente

Quando a estrutura estiver validada, serão necessários `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`, preferencialmente configurados como variáveis secretas na VPS, sem commit e sem envio ao frontend. Também será necessário confirmar o ambiente/pasta desejado na conta Cloudinary, caso o usuário queira uma organização diferente do padrão seguro por tenant.
