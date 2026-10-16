# Validação de Estabilidade — Template Ministerial Base

## Verificação inicial

Após introduzir a casca global de estabilidade do Template Ministerial Base, a landing comercial existente foi verificada em páginas completas nos viewports de **320 × 568 px** e **375 × 667 px**. A página permaneceu em rolagem vertical única, sem overflow horizontal visível, sem barra lateral duplicada e sem deslocamento lateral durante a renderização.

## Proteções herdáveis criadas

| Proteção | Regra aplicada no núcleo |
| --- | --- |
| Raiz pública | Largura máxima de 100%, `overflow-x: clip` e isolamento de layout. |
| Mídias | Imagens, vídeos, iframes, canvas e SVG limitados a 100% da largura do container. |
| Containers | Largura baseada em `min(100% - padding, max-width)`, sem uso de `100vw`. |
| Grade | Colunas com `minmax(0, ...)` e descendentes com largura mínima controlada. |
| Animação | Preferência de redução de movimento respeitada. |
| Identidade do tenant | Apenas variáveis de cor e conteúdo tipado; nenhum CSS estrutural por igreja. |

As próximas verificações desta fase cobrirão tablet e desktop, bem como o shell de tenant quando houver uma igreja de teste publicada.

## Tablet e desktop

As verificações em **768 × 1024 px** e **1280 × 720 px** mantiveram a estrutura comercial existente sem barra horizontal, expansão por viewport, deslocamento lateral ou scroll aninhado. As grades permaneceram dentro do container, e a rolagem continuou exclusivamente vertical.

> A casca de tenant é um componente novo e não há, nesta fundação, uma igreja publicada de demonstração. Por isso, as validações visuais confirmam a não regressão do domínio principal e as proteções do shell são cobertas por testes automatizados. A primeira publicação de tenant deverá ser novamente verificada em todos os breakpoints antes de ser liberada.
