# Cadastro Inicial do Super Admin

## Validação pública

Em 22 de agosto de 2026, a rota `https://idefazei.com.br/admin/login` foi validada após a implantação da migração `0026`. Como a base de produção não possuía Super Admin, a rota exibiu corretamente a tela **Configurar Super Admin** com os campos de nome, e-mail administrativo, senha, confirmação e código de configuração.

## Proteções aplicadas

O cadastro só é disponibilizado enquanto não existir administrador e exige um código único mantido no ambiente privado da VPS. A criação é transacional e usa uma trava singleton no banco para impedir duas criações simultâneas. Após a primeira conta, a tela volta a exibir somente o login administrativo.
