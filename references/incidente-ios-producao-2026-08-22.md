# Incidente de tela vazia no Safari iOS — 22 de agosto de 2026

## Causa confirmada

A VPS entregava uma versão antiga da aplicação: o bundle público era `index-Ddaxl3n-.js` e o Service Worker ainda usava o cache `lampas-v3`. Essa versão não continha as proteções de inicialização, a recuperação de cache nem o carregamento sob demanda criados nas fases 77 e 78.

## Correção aplicada em produção

A versão `1a63358` foi sincronizada ao repositório GitHub e instalada na VPS. As migrações `0023`, `0024` e `0025` foram aplicadas e o serviço `idefazei` foi reiniciado.

## Evidência pública após a atualização

| Item | Resultado |
| --- | --- |
| Bundle entregue | `/assets/index-CnrRsxUm.js` |
| Bootstrap de recuperação iOS | Presente no HTML público |
| Service Worker | `ide-fazei-v4` |
| Resposta offline segura | Presente no Service Worker |
| Serviço systemd | Ativo |

## Observação para aparelhos afetados

> Um Safari que já tenha mantido a versão anterior pode continuar controlado pelo Service Worker antigo até a próxima atualização de página. O usuário deve fechar a aba, abrir novamente `https://idefazei.com.br` e, se necessário, limpar os dados do site em **Ajustes → Safari → Avançado → Dados dos Sites → idefazei.com.br**.

## Correção complementar — exceção após a recuperação

Após a atualização de cache, os diagnósticos de produção registraram apenas `resource_load` no iPhone. A investigação confirmou que o HTML ainda continha um script de analytics com os placeholders `%VITE_ANALYTICS_ENDPOINT%` e `%VITE_ANALYTICS_WEBSITE_ID%` sem configuração. O coletor de bootstrap também tratava qualquer falha de recurso — inclusive fontes, ícones e scripts auxiliares — como falha crítica, exibindo a recuperação mesmo quando o JavaScript da aplicação estava disponível.

A versão `d94697a` removeu o script de analytics não configurado e restringiu a recuperação a falhas do JavaScript principal da aplicação. A VPS foi reconstruída, reiniciada e a página pública completou o carregamento normalmente após a atualização.

## Endurecimento complementar para Safari com armazenamento restrito

A versão `ce1d8fd` passou a proteger todas as leituras críticas de armazenamento local durante a inicialização do tema, da sessão administrativa e da resolução de tenant. A tela de erro React também passou a registrar uma mensagem sanitizada no monitoramento interno, sem expor stack técnico ao usuário final.

A versão foi reconstruída e ativada na VPS. A validação pública posterior ao reinício concluiu o carregamento normal da landing page; a confirmação no iPhone físico permanece como a etapa final do incidente.

## Encerramento do incidente

Em 22 de agosto de 2026, a página pública foi confirmada em um iPhone real após a versão reforçada ser publicada. A landing page carregou integralmente, sem a tela creme, sem o modo de recuperação e sem a tela de exceção React. O incidente de inicialização no Safari iOS está resolvido.
