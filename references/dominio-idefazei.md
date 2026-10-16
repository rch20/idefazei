# Domínio e Subdomínios — Ide Fazei

## Arquitetura recomendada

| Endereço | Finalidade | Público |
| --- | --- | --- |
| `idefazei.com.br` | Site institucional, planos, demonstração e cadastro de igrejas | Público geral |
| `www.idefazei.com.br` | Redirecionamento opcional para o domínio principal | Público geral |
| `{igreja}.idefazei.com.br` | Ambiente operacional exclusivo de cada igreja | Usuários autenticados daquela igreja |
| `{igreja}.idefazei.com.br/visitante` | Portal público da igreja, para visita e pedido de oração | Visitantes da igreja |

Exemplo: a Igreja Vida usa `vida.idefazei.com.br/login`; a Igreja Graça usa `graca.idefazei.com.br/login`. O subdomínio identifica a igreja, enquanto a sessão autenticada mantém o acesso limitado ao tenant correto.

## DNS necessário

O domínio deve ser associado ao projeto pela área de **Domínios** das configurações do ambiente antes de alterar o DNS. Essa área exibirá o alvo e eventuais registros de verificação corretos para a publicação; os valores devem ser copiados exatamente como forem apresentados nela.

| Registro DNS | Nome | Finalidade | Valor |
| --- | --- | --- | --- |
| Domínio principal | `@` | Direcionar `idefazei.com.br` à plataforma | Usar o alvo exibido na área de Domínios |
| Subdomínio `www` | `www` | Redirecionar ou apontar a versão com `www` | Usar o alvo exibido na área de Domínios |
| Curinga | `*` | Direcionar qualquer igreja, como `vida.idefazei.com.br` | Usar o alvo exibido na área de Domínios |
| Verificação, se solicitada | Conforme exibido | Confirmar a propriedade do domínio | Copiar exatamente o registro solicitado |

> Não é necessário criar um registro DNS novo para cada igreja. O registro curinga `*.idefazei.com.br` cobre os subdomínios operacionais, e o sistema resolve o slug da igreja internamente.

## Sequência de publicação segura

1. Criar um checkpoint do projeto concluído.
2. No painel do projeto, abrir **Configurações → Domínios** e adicionar `idefazei.com.br`.
3. Copiar os registros indicados para o provedor DNS que controla o domínio.
4. Adicionar o registro curinga `*` apontando para o mesmo destino indicado pela plataforma.
5. Aguardar a validação do domínio e do certificado HTTPS.
6. Publicar o checkpoint pela interface do projeto; a publicação é uma ação do titular.
7. Testar o domínio principal e criar uma igreja-piloto, como `vida.idefazei.com.br`.
8. Confirmar login, isolamento de dados e o Portal do Visitante no subdomínio-piloto.

## E-mail institucional

O endereço `contato@idefazei.com.br` deve ser criado em um provedor de e-mail escolhido pelo titular do domínio. Ele pode ser usado na página de Contato, suporte e comunicações institucionais. A configuração de e-mail não precisa hospedar o sistema; o projeto pode continuar usando a hospedagem integrada com o domínio próprio apontado por DNS.

## Checklist antes de apontar o DNS

- O domínio está sob seu controle administrativo.
- A publicação da versão mais recente foi revisada no preview.
- O slug de cada igreja será único, simples e sem espaços.
- O registro curinga não conflita com outro serviço que já use subdomínios do domínio.
- O e-mail institucional terá seus próprios registros de e-mail, sem alterar os registros web necessários ao site.
