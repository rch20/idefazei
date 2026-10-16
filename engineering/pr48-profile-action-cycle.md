# PR #48 — Ciclo de ação da ficha central

## Objetivo

Fechar o ciclo iniciado pelo resumo executivo da ficha de Pessoas. Quando a liderança escolher o próximo passo, a interface deve explicar o destino, preservar o contexto da Pessoa e oferecer um retorno direto à ficha.

## Problema identificado

A ficha já calcula um único próximo passo e os botões de Cuidado e Participações abrem a seção correspondente. Entretanto, o caminho de Consolidação navega apenas para `/app/consolidacao`. O caso exato não é destacado e o usuário precisa procurar novamente a Pessoa. Depois da navegação, também não existe um caminho visível de retorno à ficha.

## Comportamento definido

Quando o próximo passo for **Registrar primeiro contato**, a ficha abrirá a Consolidação com o `personId` e a origem contextual na URL. A Consolidação localizará primeiro um caso moderno e, quando necessário, o registro legado correspondente pela relação Nova Alma–Pessoa. O item encontrado será expandido e destacado. A tela exibirá um aviso curto informando que veio da ficha e oferecerá **Voltar à ficha**.

Quando o próximo passo for **Enviar para Célula**, a ficha exibirá um feedback curto e abrirá a seção Participações. Quando o próximo passo for **Definir responsável** ou **Iniciar consolidação**, exibirá feedback equivalente e abrirá Cuidado. A seção ativa continuará sincronizada com a URL.

## Limites

A mudança é somente de experiência e navegação. Não cria tabelas, endpoints, status, permissões ou fontes de dados. Não altera a separação oficial entre Jornada, participação em Célula e cuidado. O retorno usa os dados já carregados e permanece tenant-aware porque a Consolidação e a ficha continuam protegidas pelos contratos existentes.

## Critérios de aceite

1. A ação de primeiro contato abre a Consolidação com o identificador contextual da Pessoa.
2. Um caso moderno correspondente é expandido e destacado quando existir.
3. Um registro legado correspondente é expandido e destacado quando não existir caso moderno.
4. A Consolidação oferece retorno para a ficha na seção original.
5. As ações de Célula, responsável e início de consolidação exibem feedback e abrem o contexto correto.
6. A URL da ficha continua contendo `personId` e `section`.
7. Não há chamadas novas ao backend nem mutações durante a navegação.
8. Os testes estáticos, typecheck, suíte completa e build permanecem aprovados.
