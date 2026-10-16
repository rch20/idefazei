# Validação — Fase 56: Correção de Comprovantes

O comprovante pode ser removido ou substituído dentro da conciliação bancária correta. A substituição envia o novo arquivo antes de remover o vínculo anterior, evitando que uma falha de envio deixe a conciliação sem comprovante.

| Controle validado | Resultado |
| --- | --- |
| Escopo da remoção | Exige igreja, conciliação e comprovante correspondentes |
| Permissão | Mantém o guard de Tesouraria no servidor |
| Dados financeiros | Lançamentos, saldos, fechamento e conciliação não são alterados |
| Regressões | TypeScript aprovado; 100 testes Vitest aprovados |
| Mobile sem sessão | A rota protegida redireciona corretamente para o login |
