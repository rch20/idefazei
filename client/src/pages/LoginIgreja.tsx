import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { clearChurchSession } from "@/hooks/useChurchAuth";
import { useTenant } from "@/hooks/useTenant";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginData = z.infer<typeof loginSchema>;

const ROLE_LABELS: Record<string, string> = {
  pastor_presidente: "Pastor Presidente",
  pastor_local: "Pastor Local",
  supervisor: "Supervisor",
  lider: "Líder",
  consolidador: "Consolidador",
  diacono: "Diácono",
  secretario: "Secretário",
  tesoureiro: "Tesoureiro",
  membro: "Membro",
};

export default function LoginIgreja() {
  const [, navigate] = useLocation();
  const { isChurchSubdomain } = useTenant();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = trpc.churchAuth.login.useMutation({
    onSuccess: (data: { token: string; user: { id: number; name: string | null; role: string; churchId: number } }) => {
      // Armazena o token JWT no localStorage
      localStorage.removeItem("admin_token");
      clearChurchSession();
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("church_token", data.token);
      storage.setItem("church_user", JSON.stringify(data.user));
      toast.success(`Bem-vindo(a), ${data.user.name ?? ""}!`);
      // Redirecionamento automático por perfil
      const role = data.user.role;
      if (role === "pastor_presidente" || role === "pastor_local" || role === "secretario") {
        navigate("/app/dashboard");
      } else if (role === "lider" || role === "supervisor") {
        navigate("/app/celulas");
      } else if (role === "consolidador") {
        navigate("/app/consolidacao");
      } else if (role === "tesoureiro") {
        navigate("/app/configuracoes");
      } else {
        navigate("/app/dashboard");
      }
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Email ou senha inválidos.");
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="500" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
          <circle cx="30%" cy="40%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
          <circle cx="70%" cy="60%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 py-5 px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <span className="text-[#c9a84c] font-bold text-sm">✦</span>
          </div>
          <div>
            <span className="font-bold text-[#1e3a5f] text-base tracking-tight">Ide Fazei</span>
            <span className="text-[#c9a84c] text-[10px] block leading-none tracking-widest uppercase">Plataforma Ministerial</span>
          </div>
        </a>
        {!isChurchSubdomain && (
          <a href="/cadastro-igreja" className="text-sm text-[#1e3a5f]/60 hover:text-[#1e3a5f] transition-colors">
            Cadastrar nova igreja →
          </a>
        )}
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo da Igreja (placeholder) */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1e3a5f] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-[#c9a84c] text-2xl font-bold">✦</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1e3a5f] mb-1">Acesso à Plataforma</h1>
            <p className="text-[#1e3a5f]/50 text-sm">Entre com seu email e senha cadastrados</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-[#c9a84c]/20 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl text-[#1e3a5f]">Entrar</CardTitle>
              <CardDescription>Acesse o painel da sua igreja</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-[#1e3a5f] font-medium text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="password" className="text-[#1e3a5f] font-medium text-sm">Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1e3a5f]/40 hover:text-[#1e3a5f] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-[#1e3a5f]/60 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="rounded border-[#c9a84c]/30" />
                    Lembrar-me
                  </label>
                  <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-[#c9a84c] hover:text-[#b8943e] transition-colors">
                        Esqueci a senha
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display text-navy">Recuperação de senha</DialogTitle>
                        <DialogDescription>
                          Para proteger os dados da igreja, a redefinição de senha é feita pelo Pastor Presidente ou administrador responsável. Entre em contato com a liderança da sua igreja para receber uma nova senha de acesso.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end pt-2">
                        <Button type="button" className="bg-navy text-white" onClick={() => setForgotPasswordOpen(false)}>Entendi</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-5"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                  ) : (
                    "Entrar na Plataforma"
                  )}
                </Button>
              </form>

              {/* Perfis disponíveis */}
              <div className="mt-6 pt-5 border-t border-[#c9a84c]/20">
                <p className="text-xs text-[#1e3a5f]/40 text-center mb-3 uppercase tracking-wider">Perfis disponíveis</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {Object.values(ROLE_LABELS).map((label) => (
                    <span key={label} className="px-2 py-0.5 bg-[#1e3a5f]/5 text-[#1e3a5f]/50 text-xs rounded-full border border-[#1e3a5f]/10">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[#1e3a5f]/40 mt-6">
            Não tem acesso? Fale com o administrador da sua igreja.
          </p>
        </div>
      </div>
    </div>
  );
}
