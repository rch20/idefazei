import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const passwordSchema = z.object({
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(128),
  confirmation: z.string().min(1, "Confirme a nova senha"),
}).refine((value) => value.password === value.confirmation, {
  path: ["confirmation"],
  message: "As senhas não coincidem",
});

export default function RedefinirSenha() {
  const [location, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "", [location]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const resetMutation = trpc.churchAuth.resetPassword.useMutation({
    onSuccess: () => {
      setCompleted(true);
      setError("");
    },
    onError: (mutationError) => setError(mutationError.message || "Não foi possível redefinir a senha."),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = passwordSchema.safeParse({ password, confirmation });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }
    if (!token) {
      setError("O link de recuperação está incompleto ou inválido.");
      return;
    }
    setError("");
    resetMutation.mutate({ token, password });
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] px-4 py-8 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e3a5f] text-white shadow-lg">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#1e3a5f]">Nova senha</h1>
          <p className="mt-2 text-sm text-[#1e3a5f]/60">Crie uma nova senha segura para voltar ao painel da sua igreja.</p>
        </div>

        <Card className="border-[#c9a84c]/30 bg-white/90 shadow-xl">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#1e3a5f]">Redefinir senha</CardTitle>
            <CardDescription>O link é válido por uma hora e só pode ser usado uma vez.</CardDescription>
          </CardHeader>
          <CardContent>
            {completed ? (
              <div className="space-y-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <div>
                  <h2 className="font-semibold text-[#1e3a5f]">Senha atualizada</h2>
                  <p className="mt-2 text-sm text-slate-600">Sua senha foi redefinida. Agora você já pode entrar na plataforma.</p>
                </div>
                <Button type="button" className="w-full bg-[#1e3a5f] text-white" onClick={() => navigate("/login")}>Ir para o login</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                  <Label htmlFor="reset-password">Nova senha</Label>
                  <div className="relative mt-1">
                    <Input id="reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" placeholder="Pelo menos 8 caracteres" />
                    <button type="button" aria-label={showPassword ? "Ocultar nova senha" : "Mostrar nova senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reset-confirmation">Confirmar nova senha</Label>
                  <div className="relative mt-1">
                    <Input id="reset-confirmation" type={showConfirmation ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="pr-10" placeholder="Repita a nova senha" />
                    <button type="button" aria-label={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowConfirmation((value) => !value)}>{showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <Button type="submit" className="w-full bg-[#1e3a5f] text-white" disabled={resetMutation.isPending || !token}>
                  {resetMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar nova senha"}
                </Button>
              </form>
            )}
            <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-[#1e3a5f]/65 hover:text-[#1e3a5f]"><ArrowLeft className="h-4 w-4" /> Voltar para o login</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
