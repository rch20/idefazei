# Validação — Fase 59: Prazos de Cuidado

Cada novo encaminhamento recebe prazo padrão de três dias. O responsável pelo caso ou Pastor pode ajustar o prazo futuro de forma individual. A fila calcula o estado sem job em segundo plano: em dia, próximo do vencimento em até 48 horas, atrasado ou encerrado.

| Controle validado | Resultado |
| --- | --- |
| Isolamento | Encaminhamento é buscado por ID e igreja antes de alterar o prazo |
| Permissão | Alteração permitida apenas ao Consolidador responsável ou Pastores |
| Alertas | Painel e cartão exibem proximidade ou atraso sem expor casos fora do escopo |
| Dados existentes | Encaminhamentos anteriores recebem prazo derivado a partir da data de envio |
| Regressões | TypeScript aprovado; 103 testes Vitest aprovados |
| Mobile sem sessão | Rota protegida redireciona corretamente ao login |
