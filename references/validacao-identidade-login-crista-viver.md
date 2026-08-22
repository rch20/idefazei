# Validação — Identidade no Login da Crista Viver

O login publicado em `https://cristaviver.idefazei.com.br/login` foi validado após o deploy do commit `7ea8b04`.

| Elemento | Resultado |
| --- | --- |
| Host resolvido | `cristaviver.idefazei.com.br` |
| Nome no cabeçalho | **Cristã Viver** |
| Título de acesso | **Bem-vindo à Cristã Viver** |
| Fallback de logo | Monograma **CV**, pois ainda não há arquivo de logo configurado para o tenant |
| Cores | Tema público do tenant: azul `#1e3a5f` e dourado `#c9a84c` |
| Consulta de identidade | `tenantPublic.current` consultada no próprio subdomínio |
| Marca comercial | Não aparece no título ou no cabeçalho do login de tenant |

O fallback é apenas visual e seguro. Quando uma logo oficial for enviada pela Página Pública, o login passará a exibir esse arquivo automaticamente, sem alteração de código e sem impacto em outras igrejas.
