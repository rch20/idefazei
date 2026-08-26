import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { clearChurchSession } from "@/hooks/useChurchAuth";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";

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
  const hostname = typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
  const isCommercialDomain = hostname === "idefazei.com.br" || hostname === "www.idefazei.com.br";
  const isTenantLogin = !isCommercialDomain && hostname.split(".").length >= 3 && !hostname.startsWith("admin.") && !hostname.startsWith("www.");
  const { data: tenantPublic } = trpc.tenantPublic.current.useQuery(undefined, {
    enabled: isTenantLogin,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const tenantName = tenantPublic?.church.name ?? "Ide Fazei";
  const primaryColor = tenantPublic?.theme?.primaryColor ?? tenantPublic?.church.primaryColor ?? "#1e3a5f";
  useTenantPwaMeta({ tenantSlug: tenantPublic?.church.slug, tenantName: tenantPublic?.church.name, primaryColor, pwaIconAssetId: tenantPublic?.church.pwaIconAssetId });
  const accentColor = tenantPublic?.theme?.secondaryColor ?? tenantPublic?.church.secondaryColor ?? "#c9a84c";
  const logoUrl = tenantPublic?.theme?.logoUrl ?? tenantPublic?.church.logoUrl ?? null;
  const logoLetters = tenantName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "✦";
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
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col" style={{ "--tenant-login-primary": primaryColor, "--tenant-login-accent": accentColor } as React.CSSProperties}>
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
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={isTenantLogin ? `Página inicial da ${tenantName}` : "Página inicial da Ide Fazei"}>
            <div className="tenant-login-brand-mark tenant-login-brand-mark--header">
              {logoUrl ? <img src={logoUrl} alt={`Logo ${tenantName}`} /> : <span aria-hidden="true">{isTenantLogin ? logoLetters : "✦"}</span>}
            </div>
            <div className="min-w-0">
              <span className="tenant-login-brand-name">{tenantName}</span>
              <span className="tenant-login-brand-kicker">{isTenantLogin ? "Acesso da igreja" : "Plataforma Ministerial"}</span>
            </div>
          </Link>
        {isCommercialDomain && (
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
            <div className="tenant-login-brand-mark tenant-login-brand-mark--hero mx-auto mb-4">
              {logoUrl ? <img src={logoUrl} alt={`Logo ${tenantName}`} /> : <span aria-hidden="true">{isTenantLogin ? logoLetters : "✦"}</span>}
            </div>
            <h1 className="font-serif text-3xl font-bold text-[var(--tenant-login-primary)] mb-1">{isTenantLogin ? `Bem-vindo à ${tenantName}` : "Acesso à Plataforma"}</h1>
            <p className="text-[var(--tenant-login-primary)]/50 text-sm">{isTenantLogin ? "Entre para acessar o painel da sua igreja" : "Entre com seu email e senha cadastrados"}</p>
          </div>

          <div className="mb-4 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--tenant-login-primary)]/65 transition-colors hover:bg-white/60 hover:text-[var(--tenant-login-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-login-accent)]/60 focus-visible:ring-offset-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a página inicial
            </Link>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-[color:color-mix(in_srgb,var(--tenant-login-accent)_25%,transparent)] shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl text-[var(--tenant-login-primary)]">Entrar</CardTitle>
              <CardDescription>Acesse o painel da sua igreja</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-[var(--tenant-login-primary)] font-medium text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="mt-1 border-[color:color-mix(in_srgb,var(--tenant-login-accent)_40%,transparent)] focus:border-[var(--tenant-login-primary)] bg-white"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="password" className="text-[var(--tenant-login-primary)] font-medium text-sm">Senha</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="border-[color:color-mix(in_srgb,var(--tenant-login-accent)_40%,transparent)] focus:border-[var(--tenant-login-primary)] bg-white pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tenant-login-primary)]/40 hover:text-[var(--tenant-login-primary)] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-[var(--tenant-login-primary)]/60 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="rounded border-[#c9a84c]/30" />
                    Lembrar-me
                  </label>
                  <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-[var(--tenant-login-accent)] hover:opacity-80 transition-opacity">
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
                  className="w-full bg-[var(--tenant-login-primary)] hover:opacity-90 text-white font-semibold py-5"
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
              <div className="mt-6 pt-5 border-t border-[color:color-mix(in_srgb,var(--tenant-login-accent)_25%,transparent)]">
                <p className="text-xs text-[var(--tenant-login-primary)]/40 text-center mb-3 uppercase tracking-wider">Perfis disponíveis</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {Object.values(ROLE_LABELS).map((label) => (
                    <span key={label} className="px-2 py-0.5 bg-[color:color-mix(in_srgb,var(--tenant-login-primary)_5%,transparent)] text-[var(--tenant-login-primary)]/50 text-xs rounded-full border border-[color:color-mix(in_srgb,var(--tenant-login-primary)_10%,transparent)]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[var(--tenant-login-primary)]/40 mt-6">
            Não tem acesso? Fale com o administrador da sua igreja.
          </p>
        </div>
      </div>
    </div>
  );
}
