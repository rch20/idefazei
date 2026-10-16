# Integração da Biblioteca Digital com a Escola de Fundamentos

## Resultado implantado

A Biblioteca Digital é agora o **acervo único de materiais** da igreja. A Escola de Fundamentos não cria cópias de arquivos: cada estudo recebe referências ordenadas aos documentos, apresentações, vídeos e links já existentes no acervo.

| Área | Responsabilidade após a integração |
| --- | --- |
| Biblioteca Digital | Cadastrar, pesquisar e abrir materiais reutilizáveis da igreja. |
| Escola de Fundamentos | Criar turmas, organizar estudos, conectar materiais do acervo, matricular Pessoas, acompanhar andamento e concluir. |

## Fluxo de uso da liderança

1. O Pastor ou administrador de estudos adiciona um documento, apresentação, vídeo ou link à **Biblioteca Digital**.
2. Na **Escola de Fundamentos**, cria a turma e o estudo correspondente.
3. Em **Materiais do estudo**, seleciona o item da Biblioteca e o adiciona à sequência.
4. Pode mover a referência para cima ou para baixo, abrir o material e removê-lo apenas daquele estudo.

Remover o vínculo de um estudo não remove o material do acervo nem interfere em outros estudos ou turmas.

## Permissões e isolamento

- Pastor e administradores de estudos designados podem adicionar materiais ao acervo e vinculá-los, reordená-los ou removê-los de estudos.
- Contas operacionais não recebem controles de edição.
- Toda leitura e escrita exige `churchId` da sessão e confirma que estudo e material pertencem à mesma igreja.
- Não existe rota que aceite um material de outra igreja como referência válida.

## Validação e implantação

Foram aprovados `pnpm check`, `pnpm test` com **151 testes** e `pnpm build`. A tabela `foundation_study_materials` foi aplicada na VPS, o serviço `idefazei` foi reiniciado com sucesso e a página pública respondeu HTTP 200 após a inicialização completa.

O histórico legado de migrações da VPS continua exigindo aplicação aditiva controlada até que seja reconciliado em uma manutenção técnica própria. Nesta implantação, nenhuma tabela ou dado existente foi removido ou alterado de forma destrutiva.
