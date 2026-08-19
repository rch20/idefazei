import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { Link, useSearch } from "wouter";

export default function CadastroSucesso() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const slug = params.get("slug") || "";

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      {/* Geometria sagrada de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <svg viewBox="0 0 800 800" className="w-full h-full">
          <circle cx="400" cy="400" r="300" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="400" cy="400" r="200" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="400" cy="400" r="100" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="250" cy="400" r="150" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="550" cy="400" r="150" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Ícone de sucesso */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-gold" />
          </div>
        </div>

        {/* Título */}
        <div>
          <h1 className="text-3xl font-bold font-display text-navy mb-3">
            Igreja Cadastrada com Sucesso!
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sua solicitação foi recebida e está aguardando aprovação da nossa equipe.
            Após a aprovação, o acesso ao ambiente da sua igreja será liberado.
          </p>
        </div>

        {/* Informações do subdomínio */}
        {slug && (
          <div className="bg-white/80 border border-gold/20 rounded-xl p-6 text-left space-y-3">
            <p className="text-sm font-medium text-navy">Seu subdomínio reservado:</p>
            <div className="flex items-center gap-2 bg-navy/5 rounded-lg px-4 py-3">
              <span className="font-mono text-navy font-semibold text-sm">
                {slug}.idefazei.com.br
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Este endereço ficará disponível após a aprovação da sua conta.
            </p>
          </div>
        )}

        {/* Status de aprovação */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Aguardando aprovação</p>
            <p className="text-xs text-amber-700 mt-1">
              Nossa equipe analisa cada cadastro em até 24 horas úteis. Após a aprovação, use as credenciais definidas no cadastro para entrar na plataforma.
            </p>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="bg-white/80 border border-gold/20 rounded-xl p-6 text-left space-y-4">
          <p className="text-sm font-semibold text-navy">O que acontece após a aprovação:</p>
          <ol className="space-y-3">
            {[
              "O acesso da sua igreja será liberado",
              "Entre com as credenciais definidas no cadastro",
              "Complete o onboarding guiado em 4 etapas",
              "Comece a cadastrar membros e células",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/contato">
            <Button className="bg-navy hover:bg-navy-light text-white gap-2 w-full sm:w-auto">
              Falar com a equipe
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="border-navy/20 text-navy w-full sm:w-auto">
              Voltar ao Início
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Dúvidas?{" "}
          <Link href="/contato" className="text-gold hover:underline">
            Entre em contato
          </Link>
        </p>
      </div>
    </div>
  );
}
