# Implantação — Bloco Público de Eventos

**Data:** 22 de agosto de 2026  
**Versão da VPS:** `d61608f`

## Validação pública

O Template Ministerial Base atualizado foi publicado na VPS e `https://cristaviver.idefazei.com.br/?public-events=20260822` concluiu a renderização normal após o carregamento inicial. A página manteve o Hero, identidade e contato da Crista Viver sem regressão visual.

O bloco de Eventos fica visível somente quando duas condições verdadeiras coexistem: a seção **Eventos** está ativada e a igreja possui pelo menos um evento **ativo** com início futuro. A Crista Viver não possui evento público qualificável no momento, portanto o bloco permanece oculto intencionalmente, sem estado vazio para visitantes.

## Garantias aplicadas

| Regra | Resultado |
| --- | --- |
| Origem do tenant | Host/subdomínio resolvido no servidor. |
| Exposição | Somente ID, nome, tipo, descrição, data, horário e local. |
| Privacidade | QR code, capacidade, inscrições, check-ins e pessoas não são retornados. |
| Limite | No máximo três eventos ativos e futuros. |
| Layout | Grade de três cartões no desktop e uma coluna no mobile, com `min-width: 0` e sem `100vw`. |
