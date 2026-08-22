# Validação — Logout com Retorno à Página Pública do Tenant

A sessão da igreja agora é removida de `localStorage` e `sessionStorage` antes de qualquer navegação. Em seguida, o navegador usa `window.location.replace("/")`, preservando o host atual.

## Resultado por host

| Contexto | Destino após sair |
| --- | --- |
| `cristaviver.idefazei.com.br/app/...` | `cristaviver.idefazei.com.br/` — página pública da Cristã Viver. |
| `idefazei.com.br/app/...` | `idefazei.com.br/` — landing comercial da Ide Fazei. |

## Validação em produção

O destino público `https://cristaviver.idefazei.com.br/` foi carregado após a atualização e exibiu corretamente a página da Cristã Viver, com Hero, botão de entrada e atalhos para visitante e Pedido de Oração. Não há painel ou informações protegidas nesse destino.

O fluxo também possui teste automatizado que confirma a sequência de limpeza de sessão, atualização do estado local e redirecionamento para a raiz relativa do host.
