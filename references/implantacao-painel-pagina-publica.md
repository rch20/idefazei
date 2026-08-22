# Implantação do Painel Página Pública

**Data:** 22 de agosto de 2026  
**Versão implantada na VPS:** `7c1dbc8`

## Resultado

O painel administrativo de Página Pública foi sincronizado, compilado e ativado na VPS. A Crista Viver continuou acessível em seu subdomínio após a atualização final, com a página pública do tenant renderizando Hero, identidade e CTA próprios.

| Verificação | Resultado |
| --- | --- |
| Serviço `idefazei` | Ativo após reinício controlado. |
| Versão da aplicação na VPS | `7c1dbc8`. |
| Página pública `cristaviver.idefazei.com.br` | Renderização concluída após carregamento inicial. |
| Domínio principal | Preservado como experiência comercial em validações anteriores. |
| Contrato de escrita | Rascunho e publicação derivam `churchId` da sessão; não aceitam tenant do formulário. |
| Autorização | Publicação restrita a Pastor Presidente ou Pastor Local da mesma igreja. |
| Proteções de conteúdo | Mídias e CTAs aceitam somente caminhos internos ou URLs HTTPS. |

O teste visual autenticado do editor requer uma sessão real de Pastor da igreja. A rota protegida foi compilada e a segurança foi coberta na suíte automatizada; o visitante nunca recebe rascunhos, somente a última revisão publicada.
