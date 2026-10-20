#!/usr/bin/env python3
"""Resume o que muda entre a versão ativa e a nova e sugere o que testar (Markdown)."""
import subprocess
import sys

AREAS = [
    ("client/src/components/ChurchLayout", "Menu lateral e barra inferior: abra o menu com perfis diferentes (pastor, líder, discípulo) e confira os itens, ícones e links."),
    ("client/src/pages/", "Telas alteradas: abra cada tela listada abaixo e faça uma ação simples (listar, abrir, salvar)."),
    ("client/src/components/", "Componentes compartilhados: confira as telas que os usam."),
    ("client/src/", "Interface: navegue pelas telas principais no celular e no computador."),
    ("server/", "Servidor: o deploy de produção bloqueia mudança de servidor sem aprovação; veja o aviso do workflow."),
    ("shared/", "Código compartilhado: confira login e a tela inicial."),
    ("package.json", "Dependências: confira login, envio de imagem e geração de PDF."),
    ("pnpm-lock.yaml", "Dependências: confira login, envio de imagem e geração de PDF."),
]


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout.strip()


def main():
    old, new = sys.argv[1], sys.argv[2]
    commits = git("log", "--no-merges", "--format=- %h %s", f"{old}..{new}").splitlines()
    files = git("diff", "--name-only", f"{old}..{new}").splitlines()
    print("## O que mudou\n")
    print("\n".join(commits[:40]) or "- (sem commits novos)")
    if len(commits) > 40:
        print(f"- … e mais {len(commits) - 40} commits")
    print(f"\n{len(files)} arquivo(s) alterado(s).\n")
    print("## O que testar\n")
    seen = []
    for prefix, text in AREAS:
        if any(f.startswith(prefix) for f in files) and text not in seen:
            seen.append(text)
    pages = [f for f in files if f.startswith("client/src/pages/")]
    for text in seen or ["Nenhuma área de interface alterada: confira apenas login e a tela inicial."]:
        print(f"- {text}")
    if pages:
        print("\nTelas alteradas:")
        for f in pages[:25]:
            print(f"- `{f.rsplit('/', 1)[-1].rsplit('.', 1)[0]}`")
    print("\nSempre: entrar com um usuário, abrir a tela inicial e uma tela de listagem.")


if __name__ == "__main__":
    main()
