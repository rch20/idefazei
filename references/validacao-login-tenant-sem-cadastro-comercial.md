# Validação — Login de Tenant sem Cadastro Comercial

O login público da Crista Viver foi validado em produção em:

`https://cristaviver.idefazei.com.br/login`

## Resultado

| Elemento | Resultado |
| --- | --- |
| Convite “Cadastrar nova igreja” | Ausente no subdomínio da Crista Viver. |
| Ação comercial indevida | Não há link para `/cadastro-igreja` no login do tenant. |
| Login da igreja | Campos de e-mail, senha, lembrar-me, recuperação e entrada permanecem disponíveis. |
| Orientação final | Exibe “Fale com o administrador da sua igreja”, apropriada ao contexto de tenant. |
| Serviço da VPS | Ativo após a atualização do commit `0a1f4d1`. |

A regra é executada no cliente a partir do host: subdomínios de igreja não exibem a ação comercial; o domínio principal preserva o cadastro de novas igrejas.

## Confirmação dos dois contextos

Após a regra explícita de host ser ativada na VPS, o login de `idefazei.com.br` exibiu o link **Cadastrar nova igreja →** apontando para `/cadastro-igreja`. No mesmo momento, `cristaviver.idefazei.com.br/login` continuou sem esse link, preservando apenas as ações apropriadas ao membro da Crista Viver.
