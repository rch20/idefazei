# Proposta de Evolução do Fluxo Ministerial

## Jornada Única da Pessoa: Nova Alma, Consolidação, Célula e Ministério

**Plataforma:** Lampas  
**Status:** Proposta para análise e decisão  
**Objetivo:** simplificar o registro e o acompanhamento de pessoas, preservando o histórico espiritual e evitando cadastros duplicados.

---

## 1. Resumo executivo

Propõe-se que a **Pessoa** passe a ser o cadastro central da plataforma desde o momento em que alguém toma uma decisão de fé. O conceito de **Nova Alma** será preservado, mas como um registro de jornada ligado à ficha única da Pessoa, e não como um cadastro isolado.

> O princípio da proposta é simples: **uma pessoa, uma ficha central, vários vínculos e um histórico espiritual contínuo**.

Com isso, a igreja poderá acompanhar a mesma pessoa desde a decisão inicial, passando por consolidação, célula, batismo, formação e serviço ministerial, sem redigitar informações e sem perder o histórico de cada etapa.

| Situação atual | Modelo proposto |
|---|---|
| Nova Alma pode existir sem uma ficha completa de Pessoa. | Toda Nova Alma cria ou se vincula imediatamente a uma Pessoa. |
| Célula, Ministério e Escalas exigem Pessoa, o que pode gerar registros repetidos. | Todos os módulos usam a mesma Pessoa como referência. |
| A passagem entre módulos pode depender de operações manuais dispersas. | A ficha apresenta próximos passos guiados e consistentes. |
| A relação entre os registros pode não estar visualmente clara. | Uma linha do tempo apresenta a jornada espiritual e ministerial. |

---

## 2. Problema que a proposta resolve

No fluxo ministerial, uma pessoa pode aparecer inicialmente como Nova Alma, depois participar da Consolidação, ser recebida em uma Célula e, mais adiante, servir em um Ministério. Quando cada etapa possui um cadastro independente, a equipe pode enfrentar dúvidas como:

- A Nova Alma precisa ser cadastrada novamente como Pessoa?
- Ela entra automaticamente em uma Célula?
- Ao servir em um Ministério, deixa de pertencer à Célula?
- O histórico de consolidação permanece disponível depois da integração?

A proposta elimina essa ambiguidade. Nenhum avanço na jornada apaga informações anteriores; cada mudança apenas cria ou atualiza um **vínculo** associado à mesma Pessoa.

---

## 3. Modelo conceitual proposto

```text
Pessoa (ficha central)
  ├── Registro de Nova Alma
  ├── Consolidação
  ├── Participação em Célula
  ├── Formação e Discipulado
  ├── Participação em Ministérios
  └── Escalas de Serviço
```

### 3.1. Pessoa: ficha central

A Pessoa será a identidade principal do indivíduo dentro da igreja. Nela ficam dados como nome, telefone, e-mail, endereço, dados espirituais, etapa de discipulado e observações pastorais.

Todos os demais módulos apontam para essa ficha. Portanto, a Pessoa pode ter uma célula ativa, participar de vários ministérios, receber escalas e possuir todo o histórico de decisões, consolidação e formação.

### 3.2. Nova Alma: marco da decisão de fé

O registro de Nova Alma continuará existindo, mas será criado em conjunto com a Pessoa ou vinculado a uma Pessoa já existente. Ele preservará informações específicas do momento da decisão:

| Informação | Finalidade |
|---|---|
| Data da decisão | Registrar o marco espiritual inicial. |
| Origem | Indicar se a decisão ocorreu em culto, célula, evangelismo, evento, indicação ou redes sociais. |
| Quem ganhou | Identificar a Pessoa da igreja responsável por esse primeiro contato. |
| Aceitou Jesus, reconciliação e primeira visita | Qualificar o tipo de decisão. |
| Observações | Registrar contexto útil para o cuidado inicial. |

O sistema deverá verificar possíveis duplicidades antes de criar a Pessoa, usando principalmente telefone e e-mail quando disponíveis. Caso encontre uma Pessoa compatível, a equipe poderá escolher entre **vincular a Nova Alma à ficha existente** ou seguir com a criação de um novo cadastro.

---

## 4. Jornada operacional proposta

| Etapa | Ação da equipe | Resultado no sistema |
|---|---|---|
| 1. Decisão | Registrar Nova Alma. | Cria ou vincula uma Pessoa e registra o marco espiritual. |
| 2. Consolidação | Indicar consolidador e realizar contatos. | Checklist, histórico e responsáveis ficam ligados à mesma Pessoa. |
| 3. Integração em Célula | Selecionar uma célula ativa. | Cria vínculo de participação na célula. |
| 4. Formação | Registrar Fundamentos, Batismo, Encontro com Deus e Escola de Líderes. | Atualiza o histórico e a etapa de discipulado. |
| 5. Serviço | Designar Ministério(s). | Cria vínculos de participação ministerial. |
| 6. Escala | Selecionar pessoa, ministério, data e função. | Cria escala de serviço baseada em vínculos já existentes. |

### 4.1. Próximos passos guiados

Depois de registrar uma Nova Alma, a ficha mostrará ações objetivas e contextuais:

1. **Iniciar consolidação** — selecionar o consolidador responsável.
2. **Enviar para célula** — selecionar uma célula ativa quando a pessoa estiver pronta.
3. **Atualizar etapa de discipulado** — registrar o avanço na jornada.
4. **Designar ministério** — ação opcional, indicada apenas após integração e preparo.

Essas ações aparecerão conforme a situação da Pessoa, evitando apresentar opções fora de contexto.

---

## 5. Regras de negócio propostas

### 5.1. Célula

Uma Pessoa deverá ter **uma única célula ativa por vez**. Se houver transferência, a participação anterior será encerrada, com data e histórico preservados, e a nova participação será criada. Isso impede que a mesma pessoa seja contabilizada em duas células ativas simultaneamente.

### 5.2. Ministério

Uma Pessoa poderá participar de **um ou mais ministérios** ao mesmo tempo. Ministério é uma atribuição de serviço; por isso, não substitui nem altera automaticamente o vínculo com a Célula.

### 5.3. Escalas

Uma Pessoa poderá ser escalada apenas em um Ministério no qual esteja ativa. Antes de gravar a escala, o sistema deve validar:

- a Pessoa pertence à mesma igreja;
- o Ministério pertence à mesma igreja;
- a Pessoa está ativa naquele Ministério;
- a função e a data foram informadas.

### 5.4. Segurança e isolamento de dados

Toda relação continuará protegida pelo tenant da igreja. Nenhuma Pessoa, Nova Alma, Célula, Ministério, Escala ou histórico poderá ser associado a dados de outra igreja.

### 5.5. Sem perda de histórico

O avanço espiritual não apagará registros anteriores. A Nova Alma continuará como histórico da decisão; a Consolidação continuará disponível após entrada em Célula; e transferências de célula ou alterações ministeriais manterão rastreabilidade.

---

## 6. Experiência de uso esperada

### Cadastro de Nova Alma

O modal de cadastro solicitará somente os dados necessários para o primeiro cuidado: nome, telefone, data/origem da decisão, quem ganhou a alma e observações. Ao salvar, a plataforma criará ou identificará a Pessoa central e exibirá uma confirmação clara do próximo passo recomendado.

### Ficha única da Pessoa

A ficha terá uma visão organizada em seções:

| Seção | Conteúdo |
|---|---|
| Identidade e contato | Dados pessoais e formas de contato. |
| Jornada espiritual | Linha do tempo de discipulado. |
| Consolidação | Responsável, checklist e anotações. |
| Célula | Célula ativa, data de entrada e histórico de transferências. |
| Ministérios | Equipes em que a Pessoa serve. |
| Escalas | Próximas e anteriores escalas ministeriais. |
| Histórico pastoral | Observações e registros autorizados. |

---

## 7. Tratamento dos dados existentes

Os registros já existentes de Nova Alma não devem ser vinculados automaticamente por nome, pois pessoas diferentes podem ter nomes semelhantes. A migração deve ser assistida e segura.

Para cada Nova Alma antiga sem vínculo, serão oferecidas duas opções:

1. **Vincular a uma Pessoa existente** — com busca por nome, telefone ou e-mail;
2. **Criar Pessoa a partir da Nova Alma** — aproveitando os dados já cadastrados.

Essa etapa pode ser executada gradualmente, sem interromper o uso atual da plataforma.

---

## 8. Plano de implementação sugerido

| Fase | Entrega | Benefício principal |
|---|---|---|
| 1 | Criar/vincular Pessoa no cadastro de Nova Alma e impedir duplicidade básica. | Elimina registros soltos e duplicados. |
| 2 | Adicionar painel de próximos passos: Consolidação, Célula e etapa de discipulado. | Orienta a equipe no cuidado inicial. |
| 3 | Implementar regra de uma Célula ativa por Pessoa e histórico de transferência. | Mantém dados organizados e indicadores corretos. |
| 4 | Restringir Escalas a participantes ativos do Ministério. | Evita designações indevidas. |
| 5 | Criar linha do tempo da Pessoa e assistente de migração dos dados já existentes. | Dá visibilidade e preserva o histórico. |

---

## 9. Decisão solicitada

Solicita-se a aprovação desta proposta para implementar o modelo de **Jornada Única da Pessoa**.

Caso aprovada, a plataforma passará a tratar Nova Alma, Consolidação, Célula, Discipulado, Ministério e Escala como partes de uma única trajetória, com regras claras de atribuição e sem duplicidade de cadastros.

> **Decisão recomendada:** aprovar a implementação em fases, começando pelo vínculo automático entre Nova Alma e Pessoa, pois essa é a base para todos os demais aprimoramentos.
