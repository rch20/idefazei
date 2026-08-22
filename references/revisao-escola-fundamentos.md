# Revisão da Escola de Fundamentos

## Fluxo revisado da liderança

| Etapa | Ação agora disponível | Resultado esperado |
| --- | --- | --- |
| 1. Criar turma | Botão **Criar turma** no cabeçalho e CTA **Criar primeira turma** no estado vazio. | A liderança cadastra nome, área de fundamento e descrição sem depender do suporte. |
| 2. Matricular Pessoas | Botão **Matricular Pessoa** em cada turma. | A pessoa entra como `matriculado` e fica vinculada somente ao curso da própria igreja. |
| 3. Acompanhar | Cada cartão exibe totais de matriculados, em andamento e concluídos. | A liderança enxerga a situação da turma sem abrir outro módulo. |
| 4. Concluir | Seletor de status por pessoa e ação de certificado após conclusão. | O histórico de progresso e a data de conclusão são mantidos. |

## Proteções mantidas

- Criar turma, matricular e atualizar progresso exigem autorização administrativa no servidor.
- Cada consulta de curso, pessoa ou matrícula continua vinculada ao `churchId` da igreja autenticada.
- Uma matrícula só é criada depois de confirmar que curso e pessoa pertencem ao mesmo tenant.
- A lista de participantes passou a quebrar linhas e truncar nomes longos de modo responsivo, sem expansão horizontal.

## Validação

O projeto foi validado com TypeScript, build e **144 testes**. A versão foi sincronizada na VPS, reconstruída e o serviço `idefazei` está ativo.
