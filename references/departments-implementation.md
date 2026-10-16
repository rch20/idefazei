# Implementação de Departamentos

## Objetivo

Departamentos são equipes operacionais subordinadas a um Ministério. Cada registro possui `id`, `churchId` e `ministryId`, garantindo identidade própria, isolamento por tenant e vínculo obrigatório com o Ministério de origem.

## Modelo

| Entidade | Finalidade |
|---|---|
| `departments` | Cadastro, descrição, líder, Ministério e estado ativo |
| `department_members` | Participantes ativos e histórico de entrada/saída |
| `department_role_assignments` | Funções exercidas no Departamento e histórico de encerramento |
| `schedule_items.departmentId` | Escopo departamental opcional; nulo mantém Escala geral do Ministério |

## Permissões

| Ação | Regra |
|---|---|
| Criar Departamento | Pastor Presidente, Pastor Local ou Secretário |
| Definir/trocar líder | Pastor Presidente ou Pastor Local |
| Editar dados | Administração da igreja, líder do Ministério ou líder do Departamento |
| Adicionar/remover participante | Administração da igreja, líder do Ministério ou líder do Departamento |
| Atribuir/encerrar função | Administração da igreja, líder do Ministério ou líder do Departamento |
| Criar Escala geral do Ministério | Responsáveis autorizados pelo Ministério |
| Criar Escala departamental | Responsáveis autorizados pelo Departamento ou Ministério |

O líder selecionado precisa ser uma Pessoa ativa da mesma igreja e participante ativo do Ministério. Ao assumir, ele entra automaticamente no Departamento. Participantes de Departamento também precisam pertencer ao Ministério correspondente.

## Integridade

As operações críticas utilizam transações e bloqueio da linha do Departamento para serializar liderança, participantes e funções. Todas as consultas e mutações incluem `churchId`. Escalas departamentais validam que o Departamento pertence ao Ministério informado e que a Pessoa participa ativamente da equipe.

## Interface

O painel fica dentro do detalhe de cada Ministério e não abre um segundo modal. A criação, edição, liderança, participantes, funções e desativação são gerenciadas no mesmo fluxo. A confirmação de desativação é inline para evitar conflitos de foco.

Na página Escalas, Departamento é opcional. Sem Departamento, o fluxo continua ministerial. Com Departamento, somente participantes ativos da equipe ficam disponíveis. Botões e opções são derivados das capacidades retornadas pelo backend.

## Migração e rollback

A migração `0034_previous_xorn.sql` é aditiva: cria três tabelas, adiciona a coluna anulável `departmentId` em `schedule_items` e cria índices. Registros de Escalas existentes permanecem com `departmentId = NULL`.

Antes do deploy devem ser preservados um dump do banco e o build anterior. Em caso de falha durante a ativação, o serviço deve continuar no commit anterior. Após migração bem-sucedida, o rollback da aplicação é compatível porque a coluna e as tabelas adicionais não alteram contratos antigos; a remoção física do schema só deve ocorrer em janela de manutenção e após confirmação de ausência de dados departamentais.
