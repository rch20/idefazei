# Trilhas Visuais da Escola de Fundamentos

## Estrutura implantada

Cada turma de Fundamentos agora pode ser organizada em **módulos**, e cada módulo contém uma sequência própria de estudos. Os materiais continuam no acervo da Biblioteca Digital e são apenas referenciados pelos estudos; não há cópia de arquivos.

| Elemento | Finalidade |
| --- | --- |
| Turma | Jornada completa de Fundamentos e seus participantes. |
| Módulo | Etapa de aprendizagem, como “Alicerces da Fé” ou “Vida com Deus”. |
| Estudo | Roteiro de encontro dentro de um módulo. |
| Material | Documento, apresentação, vídeo ou link reutilizável da Biblioteca Digital. |

## Uso pela liderança

1. Abra **Escola de Fundamentos → Gerenciar trilhas**.
2. Selecione a turma e crie seus módulos na ordem desejada.
3. Crie ou edite um estudo e escolha o módulo a que ele pertence.
4. Use as setas para ordenar módulos e estudos dentro de cada módulo.
5. Conecte os materiais já cadastrados na Biblioteca ao estudo correspondente.

Estudos sem módulo continuam disponíveis em uma área própria, o que preserva o conteúdo já criado antes desta evolução e permite organizá-lo gradualmente.

## Segurança e validação

- Apenas Pastor e administradores de estudos designados podem criar, editar, publicar ou reordenar módulos e estudos.
- O servidor valida a turma, o módulo e o estudo pelo mesmo `churchId`, bloqueando associações entre turmas ou igrejas distintas.
- `pnpm check`, `pnpm test` com **153 testes** e `pnpm build` foram aprovados.
- A estrutura de módulos foi aplicada na VPS, o serviço `idefazei` foi reiniciado e a página pública respondeu HTTP 200.
