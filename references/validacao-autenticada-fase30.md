# Validação real autenticada do tenant — Fases 30 a 32

## Ambiente de validação

Foi criado um tenant temporário e isolado, com uma conta de Pastor Presidente vinculada à sua ficha de Pessoa, uma Célula e duas Pessoas ativas vinculadas a ela. O tenant e todos os seus registros de teste foram removidos ao final. A igreja operacional existente não foi alterada.

## Resultados observados

| Fluxo validado | Resultado |
| --- | --- |
| Login por e-mail e senha | Sessão JWT criada e acesso liberado ao Dashboard. |
| Dashboard autenticado | Após navegação direta, exibiu os dados do `churchId` da sessão: 3 Pessoas ativas, 1 Célula e a distribuição correta do Funil. |
| Chamadas protegidas | As consultas tRPC foram enviadas com `churchId` da sessão e responderam com dados apenas do tenant temporário. |
| Células | O card de membros exibiu 2 vínculos ativos; o detalhe mostrou as Pessoas corretas. |
| Registro de encontro | O líder registrou presença completa; o resumo exibiu 2 presentes e 0 ausentes. |
| Histórico | O último encontro e o histórico recente refletiram a gravação real. |
| Duplicidade | A validação inicial revelou que dois encontros com a mesma data eram aceitos. A comparação foi corrigida e uma nova tentativa foi rejeitada com a mensagem adequada. |
| Funil em desktop | A navegação por nove etapas e as contagens por etapa foram exibidas na sessão autenticada. |
| Funil em mobile | Em viewport de 375 px, foram confirmadas nove seções verticais, painel desktop oculto e ausência de rolagem horizontal (`documentWidth = 375`). |
| Células em mobile | Em viewport de 375 px, a página manteve largura de documento de 375 px e os três indicadores foram renderizados corretamente. |
| Primeiro carregamento após login | A grade de métricas passou a exibir placeholders de carregamento até a resposta protegida estar disponível; assim, valores transitórios de zero não são apresentados como dados reais. |
| Reteste do redirecionamento | Em novo login com tenant isolado, o Dashboard chegou pelo redirecionamento padrão e concluiu com 3 Pessoas ativas e 1 Célula, correspondendo aos dados daquele tenant. |
| Precedência de tenant | Os testes agora cobrem tanto subdomínio diferente, que não substitui o `churchId` do JWT, quanto subdomínio da mesma igreja, que preserva o mesmo tenant e o slug. |

## Conclusão

A validação confirmou o login com JWT, o isolamento de dados por tenant e o fluxo de Células em execução real. A única falha encontrada durante o teste foi a comparação de data usada para impedir encontros duplicados. Ela foi corrigida por uma comparação SQL de data, coberta por teste de integração e retestada no navegador autenticado. Também foi eliminado o risco de métricas transitórias zeradas durante o primeiro carregamento do Dashboard após o login.

> O contexto de igreja já utiliza o `churchId` armazenado na sessão de igreja. O problema observado no primeiro teste era visual: a grade de métricas usava zeros como valor de espera enquanto a consulta ainda carregava. A interface agora apresenta um estado de carregamento até os dados protegidos do tenant chegarem.
