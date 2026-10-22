import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mode = "settings" | "forgot" | "reset";

/** Recuperação de senha do Super Admin: pedir o link, definir a nova senha e cadastrar o e-mail global de recuperação. */
export default function AdminRecovery({ mode, token = "", onDone }: { mode: Mode; token?: string; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const recovery = trpc.superAdmin.recoveryEmail.useQuery(undefined, { enabled: mode === "settings" });
  const save = trpc.superAdmin.saveRecoveryEmail.useMutation({
    onSuccess: () => toast.success("E-mail de recuperação salvo."),
    onError: error => toast.error(error.message),
  });
  const request = trpc.adminAuth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: error => toast.error(error.message),
  });
  const reset = trpc.adminAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha atualizada. Entre com a nova senha.");
      onDone?.();
    },
    onError: error => toast.error(error.message),
  });

  if (mode === "settings") {
    const value = email || recovery.data?.email || "";
    return (
      <Card className="bg-white/5 border-white/10 mt-6">
        <CardContent className="pt-6 space-y-3">
          <h2 className="font-semibold text-white">E-mail de recuperação do Super Admin</h2>
          <p className="text-sm text-white/50">O link para criar nova senha é enviado só para este endereço, vale 1 hora e funciona uma vez. Se ficar vazio, vai para o e-mail da própria conta.</p>
          <Input type="email" value={value} onChange={e => setEmail(e.target.value)} placeholder="recuperacao@seudominio.com.br" className="bg-white/10 border-white/20 text-white" />
          <Button disabled={save.isPending} onClick={() => save.mutate({ email: value })} className="bg-[#c9a84c] text-[#0f1923] hover:bg-[#b8943e]">Salvar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1923] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10">
        <CardContent className="pt-6 space-y-4">
          <h1 className="font-serif text-2xl font-bold text-white">{mode === "forgot" ? "Esqueci minha senha" : "Nova senha"}</h1>
          {mode === "forgot" ? (
            sent ? (
              <p className="text-sm text-white/70">Se o e-mail for de um Super Admin, enviamos o link ao e-mail de recuperação cadastrado. Confira a caixa de entrada e o spam.</p>
            ) : (
              <form onSubmit={e => { e.preventDefault(); request.mutate({ email }); }} className="space-y-4">
                <Label htmlFor="rec-email" className="text-white/70">E-mail do Super Admin</Label>
                <Input id="rec-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                <Button type="submit" disabled={request.isPending} className="w-full bg-[#c9a84c] text-[#0f1923] hover:bg-[#b8943e]">Enviar link</Button>
              </form>
            )
          ) : (
            <form onSubmit={e => { e.preventDefault(); reset.mutate({ token, password }); }} className="space-y-4">
              <Label htmlFor="rec-pass" className="text-white/70">Nova senha (mínimo 10 caracteres)</Label>
              <Input id="rec-pass" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <Button type="submit" disabled={reset.isPending || !token} className="w-full bg-[#c9a84c] text-[#0f1923] hover:bg-[#b8943e]">Salvar nova senha</Button>
            </form>
          )}
          <button type="button" className="text-xs text-white/40 underline" onClick={onDone}>Voltar ao login</button>
        </CardContent>
      </Card>
    </div>
  );
}
