# Plano de Implementação — Tesouraria da Igreja

## 1. Objetivo e limite do módulo

>A Tesouraria será o controle financeiro **interno da igreja**: entradas, saídas, saldo, fechamento mensal, relatório e impressão. Ela não substituirá o Faturamento da Lampas, que continua sendo o controle da assinatura SaaS no Stripe.

O objetivo é oferecer um fluxo direto para a rotina de culto e administração, sem criar uma contabilidade complexa. A primeira versão será um **controle gerencial por regime de caixa**: todo lançamento representa dinheiro efetivamente recebido ou pago em uma data.

O módulo não deve ser apresentado como escrituração contábil, fiscal ou substituto de contador. Ele organiza a operação financeira da igreja e produz relatórios internos claros.

## 2. Acesso, responsabilidade e segurança

| Perfil | Acesso à Tesouraria | Limite prático |
| --- | --- | --- |
| Pastor Presidente | Acesso total | Configura contas e categorias, consulta tudo, altera status, estorna lançamentos e fecha/reabre períodos |
| Pastor Local | Acesso total operacional | Consulta tudo, aprova/estorna e emite relatórios; abertura de período pode permanecer exclusiva do Pastor Presidente |
| Tesoureiro | Operação financeira | Registra entradas e saídas, edita rascunhos, consulta relatórios e imprime; não administra usuários nem a assinatura Stripe |
| Secretário | Sem acesso por padrão | Pode receber acesso somente com a função complementar de Tesoureiro |
| Demais perfis | Sem acesso | Não visualizam saldo, lançamentos ou relatórios financeiros |

As permissões serão aplicadas no servidor, com `churchId` obrigatório em todas as consultas e validação da função efetiva da conta. O Faturamento da Lampas continuará exclusivo para Pastor Presidente e Pastor Local.

## 3. Modelo financeiro simples e amadurecido

### 3.1 Contas financeiras

Cada igreja começa com duas contas configuráveis:

| Conta inicial | Uso |
| --- | --- |
| Caixa | Dinheiro físico recebido em cultos, eventos ou contribuições presenciais |
| Banco principal | Pix, transferência, cartão e pagamentos bancários |

O Pastor poderá criar outras contas quando fizer sentido, como `Banco Missões` ou `Caixa Pequeno`. O saldo é calculado a partir dos lançamentos, e não digitado manualmente após o saldo inicial.

### 3.2 Categorias de entrada

As categorias padrão aparecerão prontas, mas a igreja poderá adicionar categorias próprias sem alterar a estrutura do sistema.

| Grupo | Categorias iniciais |
| --- | --- |
| Contribuições | Dízimo, Oferta, Voto, Primícias |
| Campanhas | Missões, Ação Social, Construção, Evento/Congresso |
| Outras receitas | Doação, Venda de material, Rendimentos, Entrada manual |

O lançamento pode ser **consolidado**. Por exemplo, ao final do culto o Tesoureiro registra um único lançamento de `Oferta — R$ 1.250,00`, sem obrigar a igreja a guardar o nome de cada contribuinte. Se futuramente a igreja desejar emitir recibos individuais, esse recurso deve ser um complemento separado, com cuidado adicional de privacidade.

### 3.3 Categorias de saída

| Grupo | Categorias iniciais |
| --- | --- |
| Estrutura | Aluguel, Água, Luz, Internet, Manutenção, Material de limpeza |
| Ministério | Louvor, Infantil, Jovens, Células, Eventos, Missões |
| Administração | Material de escritório, Tecnologia, Serviços profissionais, Transporte |
| Pessoas e ação social | Ajuda social, Beneficência, Alimentação, Outros |

Além das categorias iniciais, haverá a opção **Adicionar categoria** e a categoria padrão `Outra saída`, que exige descrição para não deixar o relatório vago.

## 4. O que é um lançamento

Cada entrada ou saída terá os campos abaixo:

| Campo | Regra |
| --- | --- |
| Tipo | Entrada ou saída |
| Categoria | Uma categoria da mesma natureza do lançamento |
| Conta | Caixa, Banco principal ou outra conta ativa |
| Valor | Armazenado em centavos, para evitar erro de arredondamento |
| Data de competência financeira | A data em que o valor entrou ou saiu efetivamente |
| Forma de recebimento/pagamento | Dinheiro, Pix, transferência, cartão, cheque ou outro |
| Descrição | Obrigatória em categorias manuais e recomendada nos demais casos |
| Referência opcional | Número de recibo, comprovante, nota ou observação interna |
| Responsável | Conta que criou ou alterou o lançamento |
| Situação | Rascunho, confirmado, cancelado ou estornado |

O Tesoureiro poderá salvar um rascunho durante a conferência e confirmar quando o valor estiver conciliado. Lançamentos confirmados não serão excluídos definitivamente; caso haja erro, um Pastor poderá **estornar**, com motivo e histórico preservados.

## 5. Cálculos automáticos

O módulo calculará, para o período selecionado:

| Indicador | Fórmula |
| --- | --- |
| Total de entradas | Soma das entradas confirmadas menos entradas estornadas |
| Total de saídas | Soma das saídas confirmadas menos saídas estornadas |
| Resultado do período | Total de entradas − total de saídas |
| Saldo por conta | Saldo inicial + entradas da conta − saídas da conta |
| Saldo consolidado | Soma dos saldos de todas as contas ativas |
| Participação por categoria | Valor da categoria ÷ total do mesmo tipo no período |

O valor de cada lançamento será imutável depois do fechamento mensal. Se houver correção após o fechamento, ela será feita por estorno e novo lançamento, mantendo a rastreabilidade.

## 6. Fechamento mensal e trilha de auditoria

No final de cada mês, o Pastor Presidente poderá fechar o período. O fechamento não é obrigatório para usar a primeira versão, mas é recomendado a partir do momento em que a equipe estiver habituada ao fluxo.

| Ação | Quem pode | Registro mantido |
| --- | --- | --- |
| Criar rascunho | Tesoureiro e Pastores | Data, conta e autor |
| Confirmar lançamento | Tesoureiro e Pastores | Data de confirmação e autor |
| Editar rascunho | Autor, Tesoureiro e Pastores | Antes/depois no histórico |
| Estornar lançamento confirmado | Pastores | Motivo obrigatório, autor e data |
| Fechar mês | Pastor Presidente | Data, responsável e saldo final |
| Reabrir mês | Pastor Presidente | Motivo obrigatório e registro de auditoria |

Cada criação, edição, confirmação, cancelamento, estorno, fechamento e reabertura produzirá um registro de auditoria. Isso resolve a questão prática: a igreja sabe **o que mudou, quem alterou e quando**, sem apagar a história financeira.

## 7. Relatórios e impressão

A Tesouraria terá filtros por período, conta, tipo e categoria. A primeira impressão será uma página de relatório otimizada para `window.print()`, compatível com impressão física ou salvamento em PDF pelo navegador.

### Relatório mensal padrão

1. Cabeçalho com logo, nome da igreja, período e data de emissão.
2. Resumo com saldo inicial, entradas, saídas, resultado e saldo final.
3. Entradas agrupadas por categoria: Dízimo, Oferta, Voto, Primícias e demais categorias.
4. Saídas agrupadas por categoria: Aluguel, Água, Luz e demais categorias.
5. Relação detalhada de lançamentos, quando a igreja optar pela impressão analítica.
6. Espaço de conferência e assinatura: Tesoureiro e Pastor Responsável.

Serão oferecidos dois formatos:

| Formato | Uso |
| --- | --- |
| Resumo mensal | Prestação de contas, reunião de liderança e leitura rápida |
| Livro-caixa detalhado | Conferência interna, com cada lançamento do período |

## 8. Estrutura técnica proposta

| Tabela | Finalidade |
| --- | --- |
| `financial_accounts` | Contas financeiras da igreja, com tipo, nome, saldo inicial e status |
| `financial_categories` | Categorias de entrada e saída, padrão ou criadas pela igreja |
| `financial_transactions` | Lançamentos financeiros com tipo, valor em centavos, conta, categoria, data, situação e responsável |
| `financial_period_closures` | Fechamentos mensais por igreja e conta, quando aplicável |
| `financial_audit_logs` | Histórico imutável de ações financeiras e valores antes/depois |

O backend seguirá a sequência: schema Drizzle → migração SQL → helpers em `server/db.ts` → router `treasury` com guard de papel → interface React. Nenhum dado financeiro ficará em `localStorage` ou será misturado com tabelas de Faturamento/Stripe.

## 9. Experiência da aba

### Tela inicial

1. Cards compactos: saldo consolidado, entradas do mês, saídas do mês e resultado.
2. Seletor de período e conta financeira.
3. Botões claros: **Registrar entrada**, **Registrar saída**, **Ver relatório** e **Imprimir**.
4. Lista recente com tipo, categoria, conta, data, valor e situação.

### Registro de entrada

O formulário abrirá com categorias rápidas: Dízimo, Oferta, Voto, Primícias e `Outra entrada`. Depois, conta, valor, data, forma de recebimento e descrição opcional.

### Registro de saída

O formulário abrirá com Aluguel, Água, Luz e `Outra saída`. Depois, conta, valor, data, forma de pagamento e descrição/fornecedor. Em telas móveis, a seleção de categorias será em cartões de toque confortável.

## 10. Ordem segura de implementação

| Fase | Entrega | Critério de conclusão |
| --- | --- | --- |
| 1 | Schema, migração e permissões | Isolamento por igreja e papel coberto por testes |
| 2 | Contas, categorias e lançamentos | Entrada, saída, rascunho, confirmação e estorno funcionando |
| 3 | Painel e cálculo automático | Saldos e totais conferem com os lançamentos do período |
| 4 | Relatórios e impressão | Resumo mensal e livro-caixa imprimem corretamente |
| 5 | Fechamento e auditoria | Mês fechado impede edição direta e registra exceções |
| 6 | Validação real | Fluxos avaliados em desktop e mobile com uma igreja de teste isolada |

## 11. Decisões já recomendadas

Para manter a primeira versão útil e sem excesso de burocracia, recomendo os seguintes padrões: duas contas iniciais (`Caixa` e `Banco principal`), lançamentos consolidados para dízimos e ofertas, valor em centavos, possibilidade de categorias próprias, ausência de aprovação obrigatória na primeira versão e fechamento mensal opcional com trilha de auditoria. A obrigatoriedade de dupla aprovação, recibos individuais e conciliação bancária pode entrar em uma segunda etapa, após a igreja validar a rotina básica.
