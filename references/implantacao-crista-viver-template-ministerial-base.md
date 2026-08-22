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
