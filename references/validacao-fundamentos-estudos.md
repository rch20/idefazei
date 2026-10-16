# Validação visual — Gestão de Estudos de Fundamentos

## Sessão de conta não gestora

Em 22 de agosto de 2026, a rota autenticada `/app/escola-fundamentos` foi aberta usando uma conta com atuação de **Consolidador**. A aba exibiu apenas **Turmas e estudos**, sem o botão de criação de turma, sem a aba **Gerenciar estudos** e sem controles de matrícula, status ou edição.

Esse resultado confirma a separação visual pretendida: a conta operacional consegue consultar o conteúdo publicado, enquanto a gestão não é apresentada como possibilidade de ação.

## Validação mobile sem sessão

Uma captura separada em 375×812 sem sessão ativa encaminhou corretamente para a página de login, sem expansão horizontal perceptível no formulário. A validação autenticada em mobile dos controles de gestão depende de uma sessão de Pastor ou administrador designado.

## Validação de produção

A versão foi construída e ativada na VPS. O serviço `idefazei` respondeu como ativo, e a presença pública da igreja respondeu com HTTP 200. As tabelas `foundation_studies` e `foundation_study_administrators` foram confirmadas na base de produção.

Os comandos locais `pnpm check`, `pnpm test` e `pnpm build` foram concluídos com êxito; a suíte totalizou **148 testes**. O histórico legado de migrações da VPS permanece fora de sincronia em uma tabela anterior já existente, portanto esta migração aditiva foi aplicada de maneira idempotente e controlada, sem alteração ou remoção de dados existentes. Antes de voltar a executar a migração automática completa na VPS, esse histórico deverá ser reconciliado em uma tarefa técnica específica.
