# Auditoria técnica da Tesouraria

**Data de referência:** 26 de agosto de 2026. Esta auditoria trata a Tesouraria como livro-caixa por regime de caixa, com valores inteiros em centavos, isolamento por `churchId` e trilha de auditoria para ações críticas.

## Diagnóstico

| Área | Achado | Risco | Correção planejada |
|---|---|---:|---|
| Permissões da interface | A página usa apenas `user.role`, enquanto o backend e a navegação usam papéis efetivos e complementares | Alto | Consultar `churchAuth.effectiveRoles` e derivar todos os botões do mesmo conjunto de permissões do backend |
| Filtro por conta | O resumo filtra lançamentos, mas continua somando saldos iniciais de todas as contas | Alto | Escopar contas, saldo e cartões à conta selecionada |
| Data de referência | O saldo consolidado inclui movimentos posteriores ao mês selecionado | Alto | Calcular saldo até `endDate` e rotular o card como saldo até o período |
| Datas | A validação aceita datas impossíveis com formato válido | Médio | Validar calendário real e intervalos `startDate <= endDate` |
| Valores | O parser do cliente não lida bem com formato brasileiro e converte entradas inválidas em zero | Médio | Criar parser estrito para BRL, limitar ao intervalo do banco e bloquear submissão inválida |
| Concorrência | Confirmação, atualização e estorno podem registrar auditorias duplicadas em cliques concorrentes | Alto | Tornar atualização e log atômicos e verificar `affectedRows` antes de gravar auditoria |
| Recibo | O endpoint devolve a ficha completa do contribuinte, embora a interface só precise do nome | Alto | Projetar apenas `id` e `fullName` no retorno |
| Upload | O servidor confia apenas no MIME informado pelo navegador | Alto | Validar assinatura binária de PDF, PNG, JPEG e WebP antes de persistir |
| Nome de arquivo | O arquivo pode receber extensão duplicada | Baixo | Normalizar nome e extensão uma única vez |
| Modais | Formulários longos não possuem limite de altura consistente; erros e valores persistem entre aberturas | Médio | Adicionar rolagem responsiva e reset controlado de estado e mutações |
| Fechamento | O fechamento usa confirmação imediata e a reabertura usa `window.prompt` | Médio | Criar modal pastoral explícito com confirmação, motivo e erros inline |
| Conciliação | O modal não hidrata automaticamente uma conciliação já salva | Alto | Sincronizar formulário com a consulta atual sem sobrescrever edição do usuário |
| Botões | Confirmação de rascunho e ações críticas não mostram estado pendente contextual | Médio | Desabilitar ações durante mutações e exibir feedback consistente |
| Cards | Cards saturados e com pouca informação contextual dificultam leitura e impressão | Baixo | Usar superfícies claras, ícones semânticos, rótulos do período e melhor responsividade |
| PDF | O botão atual imprime a página inteira, sem relatório dedicado | Médio | Gerar documento imprimível exclusivo, com resumo, contas, categorias, livro-caixa, rodapé e paginação |

## Critérios de aceite

A entrega deve manter valores em centavos, rejeitar conta, categoria, pessoa ou anexo de outro tenant, preservar o fechamento de período, não alterar dados financeiros reais durante testes e produzir relatório reproduzível para o intervalo selecionado. Todas as mudanças serão cobertas por testes direcionados, suíte completa, TypeScript e build de produção antes do deploy.

## Validação visual do relatório

Uma amostra determinística com 18 lançamentos foi renderizada em A4 e resultou em duas páginas. Os quatro indicadores, saldos por conta e categorias permaneceram legíveis; o cabeçalho da tabela foi repetido na segunda página; nenhuma linha, assinatura ou rodapé foi cortado. Valores de entrada e saída mantiveram contraste sem depender exclusivamente de cor. Os cabeçalhos e rodapés automáticos exibidos pelo Chromium pertencem à preferência de impressão do navegador e podem ser desativados no diálogo ao salvar como PDF.
