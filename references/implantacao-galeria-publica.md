# Implantação — Galeria Pública por Igreja

A galeria foi implantada na VPS com a migração `0029`, que habilita a seção `gallery` dentro das páginas públicas por tenant.

## Segurança e isolamento

| Controle | Regra aplicada |
| --- | --- |
| Autorização de upload | Somente Pastor Presidente ou Pastor Local autenticado da própria igreja. |
| Tenant | Derivado do JWT no upload e do host na leitura pública. |
| Chave de arquivo | `churches/{churchId}/public/gallery/...`. |
| Formatos | PNG, JPEG e WebP. |
| Tamanho | Máximo de 4 MB por imagem. |
| Quantidade | Máximo de oito imagens por galeria. |
| Acessibilidade | Texto alternativo entre 3 e 180 caracteres obrigatório. |
| Persistência | A página aceita somente URLs internas sob o prefixo da igreja autenticada. |

## Validação pública

A Crista Viver carregou normalmente após o deploy. A página ainda não possui imagens publicadas, portanto o bloco de galeria fica oculto por design. A medição da página pública retornou `scrollWidth = 1274` e `clientWidth = 1274`, sem overflow horizontal. A galeria só se torna visível quando ao menos uma imagem válida é adicionada, salva em rascunho e publicada por um Pastor.
