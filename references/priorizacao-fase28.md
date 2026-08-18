# Priorização de melhorias por aba — Fase 28

## Critério

A priorização considera quatro fatores: impacto direto na operação semanal, esforço de implementação, dependências técnicas e risco de regressão sobre fluxos já consolidados. O objetivo não é ampliar o sistema indiscriminadamente, mas reforçar os pontos em que a liderança precisa agir com mais clareza.

| Aba | Lacuna principal | Impacto | Esforço | Dependências | Risco de regressão | Prioridade |
| --- | --- | --- | --- | --- | --- | --- |
| Células | O indicador de membros está fixo como `—`; não há registro de encontro/presença nem visão semanal de acompanhamento | Alto | Médio | Relação atual entre Pessoas e Células | Baixo a médio, com funções novas isoladas | 1 |
| Consolidação | Checklist já funciona, mas a leitura do avanço por pessoa poderia ser visualmente mais imediata | Alto | Baixo | Dados atuais de tarefas de consolidação | Baixo | 2 |
| Eventos | Check-in por QR Code já existe, mas falta um resumo consolidado de presença e ausência por evento | Médio | Médio | Registros atuais de check-in e inscrições | Baixo | 3 |
| Escalas | Modal funcional, porém a visualização ainda é prioritariamente em lista e não evidencia conflitos por data | Médio | Médio | Itens de escala existentes | Médio | 4 |
| App do Líder | Escopo foi corrigido; faltam indicadores mais específicos de acompanhamento da própria célula | Médio | Médio | Dados de célula, cuidado e consolidação | Médio | 5 |
| Comunicação | A evolução para envio por canais externos depende de integrações, consentimento e políticas operacionais | Alto | Alto | Serviço de e-mail/WhatsApp e credenciais | Médio a alto | Planejar depois |

## Recomendação

A próxima aba recomendada é **Células**. Ela é o núcleo da operação semanal e fecha uma lacuna entre a Pessoa cadastrada, a participação na Célula e o acompanhamento pastoral. A primeira intervenção deve ser objetiva: exibir a contagem real de membros ativos e criar um registro simples de encontro com presença. A partir desse dado, líderes e supervisores poderão identificar ausências e encaminhar casos relevantes para a Central de Cuidado, sem criar cadastros paralelos nem alterar a Jornada Única da Pessoa.

## Escopo sugerido para a próxima melhoria

1. Substituir o indicador fixo de membros pelo total real de vínculos ativos em células.
2. Permitir que o líder registre um encontro da sua célula, com data e pessoas presentes.
3. Exibir o último encontro, o total de presentes e os ausentes recentes na área da célula.
4. Manter o registro vinculado à Pessoa e à Célula existentes, preservando o isolamento por tenant e as permissões por escopo pastoral.

Esta proposta preserva o modelo atual, evita transformar a aba em um sistema paralelo de eventos e mantém a alteração limitada ao fluxo natural de reunião semanal de célula.
