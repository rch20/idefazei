# Validação — Pedido de Oração Público por Tenant

O fluxo de Pedido de Oração foi validado no endereço público da Crista Viver:

`https://cristaviver.idefazei.com.br/visitante?tipo=pedido_oracao`

## Resultado

| Verificação | Resultado |
| --- | --- |
| Portal carregado no subdomínio correto | Confirmado. |
| Identidade no cabeçalho | Exibe **Cristã Viver**, derivada da configuração pública do tenant. |
| Pedido de Oração pré-selecionado | Confirmado pelo parâmetro `tipo=pedido_oracao`. |
| Formulário público | Nome, telefone, e-mail e mensagem disponíveis para preenchimento. |
| Envio de solicitação | Botão ativo; persistência coberta em teste sem criar dados artificiais de visitante em produção. |
| Isolamento | O servidor rejeita `churchSlug` diferente do tenant resolvido pelo host antes de consultar ou gravar dados. |
| Privacidade | O pedido chega como lead da igreja; não é exposto no site público. |

O CTA **Pedido de Oração** também foi adicionado à página pública do Template Ministerial Base e direciona ao mesmo formulário pré-selecionado. A submissão real foi preservada para visitantes legítimos, sem inserir dados fictícios na base da Crista Viver durante a validação.
