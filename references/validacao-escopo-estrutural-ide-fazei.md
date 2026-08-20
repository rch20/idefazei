# Validação do Escopo Estrutural — Ide Fazei

## Conclusão executiva

>A Ide Fazei já possui a **base central** do modelo proposto: cada igreja é isolada, possui administrador pastoral, Pessoas únicas, Ministérios, múltiplas funções acumuláveis e permissões automáticas para funções já mapeadas. O principal ponto ainda incompleto é transformar esse catálogo inicial de funções em uma administração totalmente configurável pelo Pastor, sem perder o controle de segurança.

## Cobertura dos requisitos

| Requisito do modelo | Situação atual | Observação |
| --- | --- | --- |
| Igreja com ambiente próprio e subdomínio | **Implementado** | Cada igreja possui `churchId`, slug e isolamento de dados. A publicação de `igreja.idefazei.com.br` depende do DNS curinga do domínio. |
| Pastor como administrador principal | **Implementado** | Pastor Presidente e Pastor Local controlam configuração, estrutura e visões amplas. |
| Link de cadastro de discípulos da própria igreja | **Pendente** | Existe Portal do Visitante e cadastro de igreja, mas ainda não existe `subdominio/cadastro` para membro criar conta e aguardar aprovação da igreja. |
| Cadastro de Ministérios | **Implementado** | Ministérios e participantes são gerenciados dentro do tenant. |
| Funções dentro de Ministérios | **Implementado inicialmente** | A ficha da Pessoa já permite Ministério + Função, com catálogo inicial como Visitador, Líder de Célula, Líder de Louvor e outras funções previstas. |
| Uma ou mais funções por Pessoa | **Implementado** | A mesma Pessoa pode acumular funções ministeriais, função principal e funções complementares. |
| Permissões automáticas por função | **Implementado para funções mapeadas** | A função adiciona acessos automaticamente; por exemplo, Visitador libera Consolidação → Visitas. |
| Abas liberadas conforme responsabilidade | **Implementado para funções mapeadas** | A navegação e as procedures do servidor usam as funções efetivas acumuladas. |
| Soma de responsabilidades | **Implementado** | O login agrega perfil principal, funções complementares e funções ministeriais. |
| Áreas gerais do membro versus áreas de responsabilidade | **Implementado em grande parte** | Área do Membro e recursos gerais permanecem disponíveis; módulos ministeriais exigem função e escopo. |

## Fluxo que já funciona

```text
Igreja → Pessoa → Ministério → Função → Permissões derivadas → Áreas disponíveis no login
```

Por exemplo, uma Pessoa vinculada ao Ministério de Consolidação como **Visitador** acessa a aba **Consolidação → Visitas**, vê apenas visitas designadas e registra a realização. Se a mesma Pessoa também for **Líder de Célula**, o login soma o acesso à sua Célula e às ações de encaminhamento para Consolidação. O acesso não substitui as regras de escopo: ter uma função não libera dados de outra igreja ou de casos fora de sua responsabilidade.

## Lacunas reais antes de declarar o modelo totalmente configurável

| Prioridade | Lacuna | Recomendação |
| --- | --- | --- |
| Alta | Cadastro público de discípulos | Criar `subdominio/cadastro`, com criação de Pessoa e conta pendente, validação de e-mail e aprovação pelo Pastor/Secretário. |
| Alta | Funções criadas pelo Pastor | Criar gestão de **funções ministeriais personalizadas**, permitindo nome, Ministério, pacote de permissão e status ativo. O Pastor escolhe um pacote seguro, não permissões técnicas isoladas. |
| Média | Definição explícita de responsáveis | Permitir definir Líder de Ministério, Supervisor e substituto em cada Ministério, usando as mesmas funções atribuídas. |
| Média | Visão organizacional | Criar uma página de estrutura da igreja, com Ministérios, funções, responsáveis e pessoas por área. |
| Média | Aprovação de novos membros | Criar uma fila de membros cadastrados aguardando vínculo, função ou aprovação. |

## Recomendação de implementação

A próxima etapa recomendada é o **cadastro de discípulos por link da própria igreja**, seguido da tela de **Funções Ministeriais Personalizadas**. Isso fecha o ciclo desejado: o Pastor cria a estrutura, o membro entra no ambiente da igreja, recebe Ministério e Função, e a Ide Fazei libera automaticamente apenas as áreas apropriadas.
