# Arquitetura da experiência pública “Visite-nos”

## Objetivo

Criar uma rota pública por tenant para apresentar horários de cultos já publicados, endereço da igreja e células explicitamente autorizadas pelo pastor. Nenhum visitante informa `churchId`; o tenant continua sendo resolvido pelo subdomínio no servidor.

## Reutilização deliberada

Os horários de culto permanecem no bloco `schedule` da página pública existente, incluindo o fluxo de rascunho, revisão e publicação. A nova rota apenas lê a última revisão publicada. Não será criada uma segunda configuração de cultos.

A tabela `cells` já contém nome, líder, endereço, bairro, cidade, coordenadas, dia e horário. Serão acrescentados somente controles de publicação e privacidade.

## Novos campos de `cells`

| Campo | Tipo | Padrão | Finalidade |
|---|---|---:|---|
| `publicVisible` | booleano | `false` | Autoriza a exibição pública da célula. |
| `publicLocationMode` | enum `approximate`/`exact` | `approximate` | Define se endereço e coordenada serão exatos ou aproximados. |
| `publicLeaderContact` | booleano | `false` | Autoriza a exposição do botão de WhatsApp do líder. |

Os padrões são privados. A migração não publica automaticamente nenhuma célula existente.

## Contrato público

A consulta pública será resolvida pelo slug do host e exigirá igreja ativa e página pública publicada. Ela retornará somente: identificador, nome da célula, bairro, cidade, coordenada pública, dia e horário, nome do líder, WhatsApp autorizado e endereço apenas no modo exato.

No modo aproximado, latitude e longitude serão arredondadas para duas casas decimais, e o endereço residencial não será retornado.

## Permissões

Somente `pastor_presidente` e `pastor_local` poderão alterar publicação, localização pública e exposição de contato. Líderes e supervisores continuam gerenciando encontros conforme as regras atuais, mas não poderão tornar dados públicos.

## Mapa

O mapa público usará Leaflet com tiles padrão do OpenStreetMap solicitados apenas para a área visível, com atribuição permanente “© OpenStreetMap contributors”. Não haverá pré-carregamento em massa ou modo offline. A disponibilidade dos tiles é tratada como recurso auxiliar; a lista textual das células continuará funcional se o mapa falhar.

## Rollback

O deploy preservará backup do build e dump estrutural/dos registros afetados antes da migração. O rollback de aplicação volta ao commit anterior. O rollback de schema, caso seja indispensável, será executado somente após retirar a versão nova:

```sql
ALTER TABLE cells
  DROP COLUMN publicLeaderContact,
  DROP COLUMN publicLocationMode,
  DROP COLUMN publicVisible;
```

Como os novos campos são aditivos e privados por padrão, o rollback normal preferido é manter as colunas e voltar apenas a aplicação, evitando perda das configurações registradas.

## Referências

[1]: https://operations.osmfoundation.org/policies/tiles/ "OpenStreetMap Foundation — Tile Usage Policy"
[2]: https://www.openstreetmap.org/copyright "OpenStreetMap — Copyright and License"
