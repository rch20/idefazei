# Implantação — Bloco Público de Ministérios

**Data:** 22 de agosto de 2026  
**Versão da VPS:** `de524d3`

## Validação pública

O Template Ministerial Base atualizado foi publicado e `https://cristaviver.idefazei.com.br/?public-ministries=20260822` concluiu a renderização normal após a atualização. A página da Crista Viver preservou Hero, identidade e contato, sem regressão visual.

O bloco de Ministérios só aparece quando a seção **Ministérios** está ativada na revisão publicada e a igreja possui pelo menos um Ministério ativo. A Crista Viver não possui um Ministério público qualificável na configuração atual; por isso, o bloco permanece oculto intencionalmente, sem introduzir espaço vazio para visitantes.

## Garantias aplicadas

| Regra | Resultado |
| --- | --- |
| Origem do tenant | Subdomínio resolvido no servidor. |
| Exposição | Somente ID, nome, tipo e descrição. |
| Privacidade | Líder, participantes, funções ministeriais e escalas não são consultados ou retornados. |
| Limite | No máximo seis Ministérios ativos por igreja. |
| Layout | Grade de três cartões no desktop e uma coluna no mobile, com `min-width: 0` e sem `100vw`. |
