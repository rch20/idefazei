# Confirmação Técnica — Template Ministerial Base Multi-Tenant

**Status:** análise confirmatória. Nenhum módulo, rota, banco de dados ou tela operacional foi alterado nesta etapa.

## Decisão arquitetural

> A Ide Fazei pode evoluir para o modelo solicitado com **uma única aplicação**, uma única base de código e uma única infraestrutura de deploy. Cada igreja continuará sendo um tenant isolado, identificado pelo subdomínio, com identidade e página pública próprias.

O domínio `idefazei.com.br` ficará reservado à marca institucional/comercial, vendas e Super Admin. Os hosts de igreja, como `igrejaa.idefazei.com.br`, serão tratados como uma experiência pública de tenant; não serão cópias do domínio principal nem aplicações separadas.

## 1. Como o tenant será identificado pelo subdomínio

O mecanismo já existe no backend. A criação do contexto lê o host HTTP, remove a porta, extrai o primeiro subdomínio e ignora `www` e `admin`. Em seguida, busca a igreja pelo `slug` único.

| Host acessado | Resultado esperado |
| --- | --- |
| `idefazei.com.br` | Não há tenant; carrega a landing comercial global. |
| `www.idefazei.com.br` | Não há tenant; redireciona ou carrega a landing comercial global. |
| `admin.idefazei.com.br` | Área global de Super Admin. |
| `igrejaa.idefazei.com.br` | Resolve o slug `igrejaa` e carrega exclusivamente a Igreja A. |
| `igrejab.idefazei.com.br` | Resolve o slug `igrejab` e carrega exclusivamente a Igreja B. |

O frontend também detecta o subdomínio, mas o navegador não será a autoridade de segurança. A fonte oficial será sempre o contexto criado no servidor a partir do host recebido pela requisição.

## 2. Como o isolamento será garantido

O isolamento deve existir em quatro camadas simultâneas.

| Camada | Regra obrigatória |
| --- | --- |
| Host | O subdomínio resolve uma igreja ativa por `slug` único. Um host desconhecido não recebe uma página de outra igreja. |
| API | Leituras públicas recebem a igreja resolvida pelo host. Escritas administrativas derivam a igreja da sessão autenticada, nunca de um `churchId` confiado ao formulário. |
| Banco | Toda tabela nova de identidade, página, mídia, seção e revisão terá `churchId` obrigatório. Consultas e mutações combinarão `churchId` com o ID do registro. |
| Arquivos | Cada mídia usará uma chave sob o prefixo `churches/{churchId}/public/`; a autorização de upload e gestão validará a mesma igreja. |

Uma igreja nunca poderá enviar `churchId = B` para atualizar um registro da Igreja B enquanto estiver autenticada na Igreja A. O servidor buscará o recurso pelo ID **e** pelo `churchId` da sessão; quando não existir nessa igreja, responderá `NOT_FOUND` ou `FORBIDDEN` sem expor conteúdo de outro tenant.

O estado atual já segue esse padrão nos módulos operacionais. A nova camada pública deve reutilizar os mesmos guards e não criar um caminho de escrita alternativo.

## 3. Onde a configuração visual será armazenada

A tabela `churches` já possui `slug`, nome, logo, cores, contatos, visão e missão. Ela deve continuar como cadastro institucional e operacional, mas não deve concentrar todos os blocos de uma página pública.

| Entidade proposta | Campos principais | Finalidade |
| --- | --- | --- |
| `tenant_public_sites` | `churchId`, `templateKey`, `status`, `publishedRevisionId`, SEO básico | Raiz da página pública por igreja. |
| `tenant_themes` | `churchId`, cores validadas, fonte permitida, logo, favicon | Identidade visual restrita e consistente. |
| `tenant_page_sections` | `churchId`, `siteId`, `sectionType`, `enabled`, `sortOrder`, `content` | Hero, sobre, horários, eventos, contato e outros blocos seguros. |
| `tenant_public_media` | `churchId`, URL/chave, tipo, alt text, dimensões | Biblioteca de mídia isolada; bytes ficam fora do banco. |
| `tenant_page_revisions` | `churchId`, snapshot, status, autor, datas | Rascunho, publicação, auditoria e reversão. |

Na primeira entrega, `content` pode ser JSON validado por schemas específicos de cada bloco. Isso reduz quantidade de colunas sem abrir espaço para HTML, CSS ou JavaScript livre.

## 4. Como a página pública será carregada dinamicamente

O roteador seguirá esta decisão antes de renderizar a rota `/`:

```text
Host da requisição
  → subdomínio válido?
    → não: Landing Comercial Ide Fazei
    → sim: igreja ativa pelo slug
      → configuração publicada do tenant
        → Template Ministerial Base + tema + seções habilitadas em ordem
```

O Template Ministerial Base será código global da Ide Fazei. Ele receberá apenas uma configuração tipada e publicada. Assim, duas igrejas podem ficar muito diferentes em conteúdo e apresentação, mas ambas herdam correções, acessibilidade, proteção de scroll, desempenho e responsividade do mesmo componente.

## 5. Como o painel saberá qual tenant está sendo administrado

O painel autenticado já conhece a igreja da conta pelo JWT próprio. A futura área **Configurações → Página Pública** obedecerá à seguinte regra:

```text
Sessão JWT da conta da igreja
  → churchId confirmado no servidor
  → leitura/escrita somente de site, tema, mídia, seções e revisões daquele churchId
```

O Pastor Presidente e o Pastor Local serão os publicadores iniciais. Um Secretário poderá ser incluído mais adiante como editor de rascunhos, sem poder publicar. O painel exibirá prévia desktop/mobile, mas essa prévia não altera a versão pública até a ação explícita de publicar.

## 6. Template Ministerial Base recomendado

Não recomendo começar com três templates. O primeiro deve ser único, maduro e mobile-first, com blocos configuráveis e ordenáveis.

| Bloco | Configurável | Controle global preservado |
| --- | --- | --- |
| Hero | imagem/vídeo, título, subtítulo e até dois CTAs | altura, contraste, fallback e performance. |
| Boas-vindas | texto e destaque | tipografia e espaçamento. |
| Sobre a Igreja | história, visão, missão e valores | estrutura e legibilidade. |
| Horários e localização | cultos, endereço, mapa/link | formato e acessibilidade. |
| Ministério/Eventos | seções institucionais aprovadas | componentes e consulta segura. |
| Contato | WhatsApp, formulário, redes sociais | URLs permitidas e antispam. |
| Rodapé | textos, links e dados institucionais | layout e responsividade. |

O administrador poderá ativar/desativar blocos e mudar sua ordem, mas não criar blocos arbitrários. Essa decisão evita páginas quebradas, excesso de peso, falhas de contraste, overflow e manutenção impossível.

## 7. Como evitar regressões

A evolução será aditiva e em etapas. O dashboard, as páginas `/app/*`, Consolidação, Tesouraria, Células e demais módulos não serão reescritos. A rota comercial atual continuará atendendo o domínio principal até que o roteador passe a distinguir host principal de host tenant.

| Etapa | Entrega | O que permanece intacto |
| --- | --- | --- |
| Fundação | Schema, guards e config pública por igreja | Painel operacional atual. |
| Página pública | Subdomínio usa o Template Ministerial Base | Landing comercial no domínio principal. |
| Painel | Rascunho, prévia e publicação | Regras de autenticação e funções. |
| Blocos | Ativação e ordem de seções | Componentes globais responsivos. |
| Evolução | Revisões, SEO e templates futuros | Contrato de configuração atual. |

Toda etapa terá teste de leitura pública correta por host, bloqueio de escrita cruzada, tentativas de IDOR, publicação, reversão e renderização mobile. Mudanças de tema não poderão alcançar a Igreja B nem atualizar estilos globais da Igreja A.

## Confirmação final

A arquitetura proposta atende ao que foi solicitado:

1. **Um código e um deploy** para todas as igrejas.
2. **Subdomínio como identificador oficial** do tenant público.
3. **Isolamento no servidor, API, banco e arquivos**, não apenas na interface.
4. **Identidade e conteúdo independentes** por igreja.
5. **Template Ministerial Base** configurável por blocos, sem editor livre ou código por tenant.
6. **Domínio principal separado** para vendas, institucional e Super Admin.
7. **Crescimento futuro por templates globais**, sem reconstruir a arquitetura.

Esta é a proposta que recomendo implementar quando você aprovar o início da fase de fundação.
