import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Church, User, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const step1Schema = z.object({
  churchName: z.string().min(2, "Nome da igreja é obrigatório"),
  slug: z.string().min(3, "Mínimo 3 caracteres").max(50).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  city: z.string().optional(),
  state: z.string().length(2, "Use a sigla do estado (ex: SP)").optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email("Email inválido"),
});

const step2Schema = z.object({
  pastorName: z.string().min(2, "Nome do pastor é obrigatório"),
  pastorEmail: z.string().email("Email inválido"),
  pastorPassword: z.string().min(8, "Mínimo 8 caracteres"),
  pastorPasswordConfirm: z.string(),
}).refine(d => d.pastorPassword === d.pastorPasswordConfirm, {
  message: "As senhas não coincidem",
  path: ["pastorPasswordConfirm"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const STEPS = [
  { label: "Igreja", icon: Church, desc: "Dados da instituição" },
  { label: "Liderança", icon: User, desc: "Conta do Pastor Presidente" },
  { label: "Confirmação", icon: CheckCircle2, desc: "Revisão e envio" },
];

export default function CadastroIgreja() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerMutation = (trpc as any).register.church.useMutation({
    onSuccess: (data: { success: boolean; churchId: number; slug: string }) => {
      toast.success("Igreja cadastrada com sucesso! Aguarde a aprovação.");
      navigate(`/cadastro-sucesso?slug=${data.slug}`);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao cadastrar. Tente novamente.");
    },
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(1);
  };

  const onStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setStep(2);
  };

  const onConfirm = () => {
    if (!step1Data || !step2Data) return;
    registerMutation.mutate({
      churchName: step1Data.churchName,
      slug: step1Data.slug,
      city: step1Data.city,
      state: step1Data.state || undefined,
      phone: step1Data.phone,
      email: step1Data.email,
      pastorName: step2Data.pastorName,
      pastorEmail: step2Data.pastorEmail,
      pastorPassword: step2Data.pastorPassword,
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#c9a84c] rounded flex items-center justify-center">
              <span className="text-[#1e3a5f] font-bold text-xs">✦</span>
            </div>
            <span className="font-bold text-lg">Lampas</span>
          </a>
          <span className="text-white/60 text-sm">Cadastro de Igreja</span>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between mb-10">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    i < step ? "bg-[#c9a84c] border-[#c9a84c] text-[#1e3a5f]" :
                    i === step ? "bg-[#1e3a5f] border-[#1e3a5f] text-white" :
                    "bg-white border-[#1e3a5f]/20 text-[#1e3a5f]/40"
                  }`}>
                    {i < step ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i <= step ? "text-[#1e3a5f]" : "text-[#1e3a5f]/40"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-12px] transition-all ${i < step ? "bg-[#c9a84c]" : "bg-[#1e3a5f]/10"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Dados da Igreja */}
          {step === 0 && (
            <Card className="bg-white/80 border-[#c9a84c]/20 shadow-lg">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 text-xs">Passo 1 de 3</Badge>
                <CardTitle className="font-serif text-2xl text-[#1e3a5f]">Dados da Igreja</CardTitle>
                <CardDescription>Informe os dados institucionais da sua igreja</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-5">
                  <div>
                    <Label htmlFor="churchName" className="text-[#1e3a5f] font-medium">Nome da Igreja *</Label>
                    <Input
                      id="churchName"
                      placeholder="Ex: Igreja Viver"
                      className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f]"
                      {...form1.register("churchName")}
                    />
                    {form1.formState.errors.churchName && (
                      <p className="text-red-500 text-xs mt-1">{form1.formState.errors.churchName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="slug" className="text-[#1e3a5f] font-medium">Subdomínio *</Label>
                    <div className="flex items-center mt-1 gap-0">
                      <div className="flex items-center gap-1 px-3 py-2 bg-[#1e3a5f]/5 border border-r-0 border-[#c9a84c]/30 rounded-l-md text-[#1e3a5f]/50 text-sm">
                        <Globe size={14} />
                      </div>
                      <Input
                        id="slug"
                        placeholder="igrejaviver"
                        className="rounded-l-none border-[#c9a84c]/30 focus:border-[#1e3a5f]"
                        {...form1.register("slug")}
                      />
                      <div className="px-3 py-2 bg-[#1e3a5f]/5 border border-l-0 border-[#c9a84c]/30 rounded-r-md text-[#1e3a5f]/50 text-sm whitespace-nowrap">
                        .lampas.com.br
                      </div>
                    </div>
                    {form1.formState.errors.slug && (
                      <p className="text-red-500 text-xs mt-1">{form1.formState.errors.slug.message}</p>
                    )}
                    <p className="text-[#1e3a5f]/40 text-xs mt-1">Apenas letras minúsculas, números e hífens</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-[#1e3a5f] font-medium">Cidade</Label>
                      <Input id="city" placeholder="São Paulo" className="mt-1 border-[#c9a84c]/30" {...form1.register("city")} />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-[#1e3a5f] font-medium">Estado (sigla)</Label>
                      <Input id="state" placeholder="SP" maxLength={2} className="mt-1 border-[#c9a84c]/30" {...form1.register("state")} />
                      {form1.formState.errors.state && (
                        <p className="text-red-500 text-xs mt-1">{form1.formState.errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-[#1e3a5f] font-medium">Email da Igreja *</Label>
                    <Input id="email" type="email" placeholder="contato@igrejaviver.com" className="mt-1 border-[#c9a84c]/30" {...form1.register("email")} />
                    {form1.formState.errors.email && (
                      <p className="text-red-500 text-xs mt-1">{form1.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-[#1e3a5f] font-medium">Telefone</Label>
                    <Input id="phone" placeholder="(11) 99999-9999" className="mt-1 border-[#c9a84c]/30" {...form1.register("phone")} />
                  </div>

                  <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                    Próximo <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Conta do Pastor */}
          {step === 1 && (
            <Card className="bg-white/80 border-[#c9a84c]/20 shadow-lg">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 text-xs">Passo 2 de 3</Badge>
                <CardTitle className="font-serif text-2xl text-[#1e3a5f]">Conta do Pastor Presidente</CardTitle>
                <CardDescription>Crie as credenciais de acesso do líder principal</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-5">
                  <div>
                    <Label htmlFor="pastorName" className="text-[#1e3a5f] font-medium">Nome Completo *</Label>
                    <Input id="pastorName" placeholder="Pr. João Silva" className="mt-1 border-[#c9a84c]/30" {...form2.register("pastorName")} />
                    {form2.formState.errors.pastorName && (
                      <p className="text-red-500 text-xs mt-1">{form2.formState.errors.pastorName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pastorEmail" className="text-[#1e3a5f] font-medium">Email de Acesso *</Label>
                    <Input id="pastorEmail" type="email" placeholder="pastor@igrejaviver.com" className="mt-1 border-[#c9a84c]/30" {...form2.register("pastorEmail")} />
                    {form2.formState.errors.pastorEmail && (
                      <p className="text-red-500 text-xs mt-1">{form2.formState.errors.pastorEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pastorPassword" className="text-[#1e3a5f] font-medium">Senha *</Label>
                    <Input id="pastorPassword" type="password" placeholder="Mínimo 8 caracteres" className="mt-1 border-[#c9a84c]/30" {...form2.register("pastorPassword")} />
                    {form2.formState.errors.pastorPassword && (
                      <p className="text-red-500 text-xs mt-1">{form2.formState.errors.pastorPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pastorPasswordConfirm" className="text-[#1e3a5f] font-medium">Confirmar Senha *</Label>
                    <Input id="pastorPasswordConfirm" type="password" placeholder="Repita a senha" className="mt-1 border-[#c9a84c]/30" {...form2.register("pastorPasswordConfirm")} />
                    {form2.formState.errors.pastorPasswordConfirm && (
                      <p className="text-red-500 text-xs mt-1">{form2.formState.errors.pastorPasswordConfirm.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 border-[#1e3a5f]/20" onClick={() => setStep(0)}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                      Próximo <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirmação */}
          {step === 2 && step1Data && step2Data && (
            <Card className="bg-white/80 border-[#c9a84c]/20 shadow-lg">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 text-xs">Passo 3 de 3</Badge>
                <CardTitle className="font-serif text-2xl text-[#1e3a5f]">Confirmar Cadastro</CardTitle>
                <CardDescription>Revise os dados antes de enviar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-[#1e3a5f]/5 rounded-xl p-5 space-y-3">
                  <h4 className="font-semibold text-[#1e3a5f] text-sm uppercase tracking-wider">Igreja</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-[#1e3a5f]/50">Nome:</span>
                    <span className="text-[#1e3a5f] font-medium">{step1Data.churchName}</span>
                    <span className="text-[#1e3a5f]/50">Subdomínio:</span>
                    <span className="text-[#c9a84c] font-medium">{step1Data.slug}.lampas.com.br</span>
                    {step1Data.city && <><span className="text-[#1e3a5f]/50">Cidade:</span><span className="text-[#1e3a5f]">{step1Data.city}{step1Data.state ? ` - ${step1Data.state}` : ""}</span></>}
                    <span className="text-[#1e3a5f]/50">Email:</span>
                    <span className="text-[#1e3a5f]">{step1Data.email}</span>
                  </div>
                </div>

                <div className="bg-[#1e3a5f]/5 rounded-xl p-5 space-y-3">
                  <h4 className="font-semibold text-[#1e3a5f] text-sm uppercase tracking-wider">Pastor Presidente</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-[#1e3a5f]/50">Nome:</span>
                    <span className="text-[#1e3a5f] font-medium">{step2Data.pastorName}</span>
                    <span className="text-[#1e3a5f]/50">Email:</span>
                    <span className="text-[#1e3a5f]">{step2Data.pastorEmail}</span>
                  </div>
                </div>

                <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-xl p-4 text-sm text-[#1e3a5f]/70">
                  <p>Após o envio, seu cadastro será analisado pela equipe Lampas. Você receberá um email de confirmação quando a igreja for aprovada.</p>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-[#1e3a5f]/20" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-[#c9a84c] hover:bg-[#b8943e] text-[#1e3a5f] font-bold"
                    onClick={onConfirm}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Cadastro</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
