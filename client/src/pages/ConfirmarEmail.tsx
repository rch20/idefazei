import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function ConfirmarEmail() {
  const [location, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "", [location]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const submittedToken = useRef<string | null>(null);
  const confirmMutation = trpc.churchAuth.confirmEmail.useMutation({
    onSuccess: () => {
      setCompleted(true);
      setError("");
    },
    onError: (mutationError) => setError(mutationError.message || "Não foi possível confirmar o e-mail."),
  });

  useEffect(() => {
    if (!token) {
      setError("O link de confirmação está incompleto ou inválido.");
      return;
    }
    if (submittedToken.current === token) return;
    submittedToken.current = token;
    confirmMutation.mutate({ token });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f5f0e8] px-4 py-8 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e3a5f] text-white shadow-lg">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#1e3a5f]">Confirmação de e-mail</h1>
          <p className="mt-2 text-sm text-[#1e3a5f]/60">Um passo rápido para proteger seu acesso.</p>
        </div>

        <Card className="border-[#c9a84c]/30 bg-white/90 shadow-xl">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#1e3a5f]">{completed ? "E-mail confirmado" : error ? "Link indisponível" : "Confirmando seu e-mail"}</CardTitle>
            <CardDescription>{completed ? "Seu acesso está pronto para uso." : error ? "O link pode ter expirado ou já ter sido utilizado." : "Aguarde enquanto validamos seu link seguro."}</CardDescription>
          </CardHeader>
          <CardContent>
            {completed ? (
              <div className="space-y-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="text-sm leading-6 text-slate-600">Seu e-mail foi confirmado. Agora você já pode entrar na plataforma com a senha cadastrada.</p>
                <Button type="button" className="w-full bg-[#1e3a5f] text-white" onClick={() => navigate("/login")}>Ir para o login</Button>
              </div>
            ) : error ? (
              <div className="space-y-5 text-center">
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{error}</p>
                <p className="text-sm leading-6 text-slate-600">Se você ainda não confirmou o cadastro, solicite um novo link na tela de login.</p>
                <Button type="button" className="w-full bg-[#1e3a5f] text-white" onClick={() => navigate("/login")}>Ir para o login</Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Validando...</div>
            )}
            <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-[#1e3a5f]/65 hover:text-[#1e3a5f]"><ArrowLeft className="h-4 w-4" /> Voltar para o login</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
