# Validação — Fase 58: Relatório de Presença por Evento

O relatório consulta somente inscrições que pertencem ao evento e ao tenant solicitados. Registros cancelados ficam fora do total de inscritos; presença considera check-in confirmado ou status de participação, enquanto a ausência representa inscrição ativa sem check-in.

| Controle validado | Resultado |
| --- | --- |
| Isolamento | Evento é buscado com `eventId` e `churchId` antes da leitura das inscrições |
| Autorização | API requer administração efetiva da igreja, incluindo funções derivadas |
| Dados exibidos | Inscritos, check-ins, ausentes e lista nominal da mesma igreja |
| Impressão | Relatório abre versão própria para impressão sem alterar dados |
| Regressões | TypeScript aprovado; 101 testes Vitest aprovados |
| Mobile sem sessão | A rota protegida redireciona corretamente para o login |
