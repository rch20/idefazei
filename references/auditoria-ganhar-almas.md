# Auditoria — Ganhar Almas

## Achados e correções

- O cadastro deixava `wonById` fixo em `1`, o que podia atribuir uma nova alma a uma pessoa errada ou inexistente. O modal agora exige uma pessoa real da própria igreja e o servidor confirma o vínculo antes de gravar.
- A página recebeu estados de carregamento, erro, busca, lista vazia e reenvio de consulta, além de validação para nome, data futura e responsável.
- O modal foi reestruturado para mobile: uma coluna em telas estreitas, conteúdo com rolagem, ações fixas, campos associados a rótulos e mensagens de erro acessíveis.
- As duas rotas, `/app/almas` e `/app/ganhar-almas`, foram verificadas em tela de 375 × 812 pixels. Sem sessão, ambas direcionam corretamente ao login em vez de exibirem erro 404.
