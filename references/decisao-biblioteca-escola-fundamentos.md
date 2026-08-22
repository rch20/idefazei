# Decisão de Arquitetura — Biblioteca Digital e Escola de Fundamentos

## Decisão recomendada

O Ide Fazei deve manter **Biblioteca Digital** e **Escola de Fundamentos** como áreas distintas, conectadas por referência — nunca como duas áreas que criam a mesma coisa.

> **Biblioteca Digital** é o acervo reutilizável da igreja. **Escola de Fundamentos** é a jornada orientada que organiza conteúdo, pessoas, turmas, progresso e conclusão.

Essa separação resolve o meio-termo atual. A Biblioteca não será um segundo local para administrar turmas, e a Escola não será um segundo local para armazenar arquivos isolados.

| Área | Pergunta que responde | Responsabilidade | Não deve fazer |
| --- | --- | --- | --- |
| Biblioteca Digital | “Que materiais a igreja possui?” | Guardar e categorizar documentos, apresentações, vídeos e devocionais reutilizáveis. | Matricular, acompanhar presença, concluir cursos ou emitir certificados. |
| Escola de Fundamentos | “Qual é o caminho de formação desta pessoa ou turma?” | Montar sequência de estudos, organizar turmas, matrículas, encontros, progresso e certificado. | Duplicar arquivos e materiais a cada turma. |

## Modelo recomendado

Cada item da Biblioteca continuará sendo um **material**: PDF, DOCX, PPTX, link de vídeo ou outro recurso permitido. Na Escola, cada **estudo** terá título, objetivo, texto orientador e uma lista ordenada de materiais da Biblioteca. Por exemplo, o estudo “A graça e a salvação” pode conter um texto do professor, uma apostila em PDF, uma apresentação em PowerPoint e um vídeo do YouTube.

Uma turma não terá cópias próprias desses arquivos. Ela recebe uma sequência de estudos. Portanto, se o mesmo estudo for usado em uma turma no primeiro semestre e em outra no segundo semestre, o conteúdo é reutilizado com organização própria em cada turma. Se um material for atualizado na Biblioteca, o administrador poderá escolher aplicá-lo às novas turmas, sem alterar automaticamente aquilo que já foi concluído por turmas passadas.

## Por que este é o caminho mais sólido

O Moodle trata arquivos, páginas, links e mídias como **recursos adicionados ao curso**, enquanto o curso continua sendo o contexto de aprendizagem e matrícula. [1] O Google Classroom igualmente permite que materiais sejam organizados por tópico, reordenados, deixados em rascunho ou publicados dentro de uma turma. [2] O Thinkific separa a estrutura curricular em capítulos e lições, oferecendo diferentes tipos de conteúdo e publicação do curso. [3] O Canvas também mantém recursos compartilháveis e módulos ordenados dentro de cursos, permitindo reutilização sem confundir o acervo com a jornada do aluno. [4]

Esses sistemas concordam em um princípio: **conteúdo e percurso não são a mesma entidade**. O acervo atende à reutilização; o curso ou turma atende à experiência do aluno.

## Regra operacional simples

| Perfil | Biblioteca | Escola de Fundamentos |
| --- | --- | --- |
| Pastor | Define administradores, administra materiais e jornadas. | Cria turmas, define percurso, acompanha e conclui. |
| Administrador de estudos designado | Adiciona e organiza materiais permitidos. | Cria e edita estudos da Escola conforme a delegação pastoral. |
| Aluno ou membro | Consulta somente materiais que lhe forem liberados. | Acessa os estudos publicados da turma em que está matriculado. |

## Evolução em duas etapas

Na primeira etapa, preserva-se a Biblioteca existente e ela recebe tipos de material mais claros: **Documento**, **Apresentação**, **Vídeo** e **Link**. A Escola ganha apenas a ação “Adicionar material da Biblioteca” dentro do estudo, com ordem e visibilidade.

Na segunda etapa, após validar o uso real, adicionam-se encontros, presença por encontro, conclusão automática do percurso e uma cópia de segurança do plano de estudos utilizado pela turma. Não é recomendável começar hospedando vídeos grandes no VPS; links de provedores de vídeo e arquivos documentais oferecem menor custo e melhor funcionamento no celular.

## Conclusão

Não devemos criar uma nova “Biblioteca de Estudos” dentro da Escola. Devemos tornar a **Biblioteca Digital o acervo único** e fazer a **Escola de Fundamentos consumir esse acervo** para formar uma jornada prática de discipulado.

## Referências

[1]: https://docs.moodle.org/502/en/Resources "MoodleDocs — Resources"
[2]: https://support.google.com/edu/classroom/answer/9123621/add-materials-to-the-classwork-page-android "Google Classroom Help — Add materials to the Classwork page"
[3]: https://support.thinkific.com/hc/en-us/articles/360030371674-Create-a-Course "Thinkific Support — Create a Course"
[4]: https://community.instructure.com/en/kb/articles/664521-what-is-commons "Canvas Community — What is Commons?"
