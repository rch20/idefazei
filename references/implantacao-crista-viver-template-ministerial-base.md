# Implantação — Crista Viver no Template Ministerial Base

## Estado da implantação

Em 22 de agosto de 2026, a VPS foi atualizada para o checkpoint da fundação multi-tenant. A Igreja Crista Viver, identificada pelo slug `cristaviver` e `churchId = 1`, recebeu uma configuração publicada do template `ministerial_base` com cores institucionais azul-marinho (`#1e3a5f`) e dourado (`#c9a84c`).

## Evidência pública

O domínio `https://cristaviver.idefazei.com.br` passou a carregar o shell público específico do tenant, exibindo o nome **Cristã Viver**, identidade própria e o Hero do Template Ministerial Base. A landing comercial global deixou de ser apresentada nesse subdomínio.

## Isolamento aplicado

| Elemento | Valor validado |
| --- | --- |
| Resolução pública | Host → slug `cristaviver` → igreja ativa `churchId = 1`. |
| Configuração publicada | `tenant_public_sites` com status `published`. |
| Tema | `tenant_themes` associado exclusivamente ao `churchId = 1`. |
| Revisão | Versão publicada `1`, vinculada ao site da Crista Viver. |
| Domínio principal | Permanece destinado à landing comercial da Ide Fazei. |

> A primeira configuração usa somente informações institucionais já existentes no cadastro da Crista Viver. Hero, missão, imagens, logo, horários e seções adicionais serão enriquecidos pelo futuro painel de Página Pública, sem permitir CSS estrutural ou acesso a outro tenant.

## Validação visual pública

A página pública da Crista Viver foi carregada pelo domínio externo após a publicação. O título do Hero foi validado com contraste branco legível sobre o fundo azul-marinho; o conteúdo permaneceu dentro do viewport e não exibiu rolagem horizontal na verificação pública em desktop.

O domínio principal `idefazei.com.br` também foi acessado depois da ativação do tenant. Ele continuou seguindo a rota comercial global, sem resolver uma identidade de igreja. O carregamento inicial do bundle concluiu de forma assíncrona, como esperado para as páginas carregadas sob demanda.

Na confirmação final, a landing comercial exibiu novamente seus recursos, planos, funil, contato, cadastro de igreja e acesso administrativo. Essa validação confirma a separação entre o domínio institucional da Ide Fazei e o subdomínio público da Crista Viver.

## Medição de estabilidade

No domínio público da Crista Viver, a medição do documento renderizado retornou `scrollWidth = 1274` e `clientWidth = 1274`, sem overflow horizontal no viewport de 1280 px. O Hero, a identidade e o cartão de visita permaneceram dentro do container público estabelecido pelo Template Ministerial Base.

A mesma página foi carregada novamente em viewports emulados no próprio domínio externo. Depois da renderização completa, os resultados foram: 320 px (`scrollWidth = 314`), 375 px (`scrollWidth = 369`) e 768 px (`scrollWidth = 762`), todos sem overflow horizontal. Em cada largura, o conteúdo da Crista Viver foi renderizado antes da medição.
