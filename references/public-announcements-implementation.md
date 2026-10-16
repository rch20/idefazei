# Avisos Públicos da Igreja

## Objetivo

O Mural interno permanece protegido por autenticação. Um aviso só aparece na página pública quando `publicVisible` é verdadeiro e o usuário autorizado o publica ou agenda explicitamente.

## Estados

- `rascunho`: aviso interno ou ainda não publicado.
- `publicado`: visível imediatamente, respeitando início e expiração.
- `agendado`: torna-se visível automaticamente quando `publicStartsAt` chega.
- `arquivado`: retirado da página pública sem apagar o histórico do mural.

## Contrato de publicação

A publicação aceita categoria (`aviso`, `evento`, `comunicado` ou `devocional`), destaque, data inicial, data de expiração, CTA interno ou HTTPS e imagem opcional. O backend rejeita expiração anterior ao início, CTA incompleto e imagem pública que não esteja registrada em `media_assets` para o mesmo `churchId` e com finalidade `announcement_image`.

O endpoint público resolve a igreja pelo tenant/host e retorna somente seis avisos ativos, publicados/agendados, dentro da janela de datas. Não retorna autor, `churchId`, `mediaAssetId` nem campos internos do mural.

## Mídia

Imagens são enviadas pelo helper único de mídia para Cloudinary quando `MEDIA_PROVIDER=cloudinary`. A finalidade é `announcement_image`, com limite de 4 MB. O `mediaAssetId` é armazenado no aviso e validado no backend por tenant, provider lógico e tipo de recurso.

## Operação pastoral

No painel, o Pastor cria um aviso e decide se ele permanece interno ou se aparece na página pública. A retirada pública arquiva a publicação sem apagar o registro interno. O site público não permite comentários, edição ou criação por visitantes.

## Validação local

A implementação foi validada com TypeScript, suíte completa de 260 testes em 34 arquivos, testes de contrato do router, teste de isolamento do retorno público, teste estrutural do painel do Mural e build de produção. A migração `0038_milky_king_cobra.sql` adiciona os campos e a finalidade de mídia; a `0039_unknown_sleeper.sql` cria o índice da fila pública.

## Procedimento de produção

Antes do deploy, criar backup de código, build, runtime e banco. Aplicar as migrações 0038 e 0039 pelo procedimento idempotente já usado na VPS, gerar build como `idefazei`, reiniciar uma vez e validar HTTPS, retorno público, ausência de dados internos e logs. Não criar aviso real durante smoke test; quando necessário, usar banco temporário e remover o asset Cloudinary pelo SDK oficial.
