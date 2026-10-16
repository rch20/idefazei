# Implantação — Horários Públicos de Culto

O Template Ministerial Base passou a aceitar até sete horários institucionais por igreja. Cada item contém somente **dia**, **horário**, **descrição** e **local**; ele é validado no servidor, salvo no rascunho da Página Pública e publicado somente para o subdomínio do tenant.

## Validação em produção

| Viewport emulado | Largura do documento | Overflow horizontal |
| --- | ---: | --- |
| 320 px | 314 px | Não encontrado |
| 375 px | 369 px | Não encontrado |
| 768 px | 762 px | Não encontrado |

A Crista Viver carregou corretamente após o deploy. Como ainda não possui horários preenchidos e publicados, o bloco permanece oculto para visitantes por design, sem mostrar mensagens vazias ou dados operacionais.

## Segurança aplicada

- O tenant é derivado do host público e não é enviado pelo formulário.
- Somente Pastor com permissão de publicação da própria igreja salva ou publica a configuração.
- Não há acesso à agenda operacional, Escalas ou eventos internos.
- Não são aceitos CSS, scripts, HTML ou configurações estruturais arbitrárias.
