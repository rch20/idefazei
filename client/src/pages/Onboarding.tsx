import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Circle,
  Church,
  Users,
  Upload,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Download,
} from "lucide-react";

const CHURCH_ID = 1; // Resolvido pelo tenant em produção

type CSVRow = { fullName: string; email?: string; phone?: string; birthDate?: string };

const STEPS = [
  {
    id: 0,
    key: "stepWelcome" as const,
    title: "Bem-vindo à Lampas!",
    subtitle: "Sua plataforma ministerial está pronta",
    icon: Sparkles,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  {
    id: 1,
    key: "stepImportMembers" as const,
    title: "Importar Membros",
    subtitle: "Importe sua lista de membros via CSV",
    icon: Upload,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    id: 2,
    key: "stepCreateCell" as const,
    title: "Criar Primeira Célula",
    subtitle: "Configure sua primeira célula de discipulado",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    id: 3,
    key: "stepInviteLeaders" as const,
    title: "Convidar Líderes",
    subtitle: "Adicione líderes e pastores à plataforma",
    icon: UserPlus,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [cellName, setCellName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: progress, refetch } = trpc.onboarding.get.useQuery({ churchId: CHURCH_ID });

  const updateMutation = trpc.onboarding.update.useMutation({
    onSuccess: () => refetch(),
  });

  const importMutation = trpc.onboarding.importCSV.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} membros importados com sucesso!`);
      refetch();
    },
    onError: () => toast.error("Erro ao importar membros"),
  });

  const createCellMutation = trpc.cells.create.useMutation({
    onSuccess: () => {
      toast.success("Célula criada com sucesso!");
      updateMutation.mutate({ churchId: CHURCH_ID, stepCreateCell: true });
    },
    onError: () => toast.error("Erro ao criar célula"),
  });

  const inviteMutation = trpc.invites.create.useMutation({
    onSuccess: () => {
      toast.success(`Convite enviado para ${inviteEmail}!`);
      updateMutation.mutate({ churchId: CHURCH_ID, stepInviteLeaders: true });
      setInviteEmail("");
      setInviteName("");
    },
    onError: () => toast.error("Erro ao enviar convite"),
  });

  const completedSteps = STEPS.filter((s) => progress?.[s.key]).length;
  const progressPct = Math.round((completedSteps / STEPS.length) * 100);

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
      const rows: CSVRow[] = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        const get = (keys: string[]) => {
          for (const k of keys) {
            const idx = header.indexOf(k);
            if (idx >= 0 && cols[idx]) return cols[idx];
          }
          return undefined;
        };
        return {
          fullName: get(["nome", "name", "fullname", "nome completo"]) || cols[0] || "",
          email: get(["email", "e-mail"]),
          phone: get(["telefone", "phone", "celular", "whatsapp"]),
          birthDate: get(["nascimento", "birthdate", "data de nascimento"]),
        };
      }).filter((r) => r.fullName);
      setCsvRows(rows);
      toast.success(`${rows.length} registros encontrados no CSV`);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvRows.length) return toast.error("Nenhum dado para importar");
    importMutation.mutate({ churchId: CHURCH_ID, csvData: csvRows });
  }

  function handleCreateCell() {
    if (!cellName.trim()) return toast.error("Informe o nome da célula");
    createCellMutation.mutate({
      churchId: CHURCH_ID,
      name: cellName,
      leaderId: 1, // Resolvido pelo usuário autenticado em produção
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) return toast.error("Preencha nome e email");
    inviteMutation.mutate({
      churchId: CHURCH_ID,
      email: inviteEmail,
      name: inviteName,
      role: "lider",
    });
  }

  function handleNext() {
    // Mark current step as done
    const step = STEPS[currentStep];
    if (step.key === "stepWelcome") {
      updateMutation.mutate({ churchId: CHURCH_ID, stepWelcome: true });
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      navigate("/dashboard");
    }
  }

  function downloadTemplate() {
    const csv = "Nome Completo,Email,Telefone,Data de Nascimento\nJoão Silva,joao@email.com,(11) 99999-9999,1990-01-15\nMaria Santos,maria@email.com,(11) 88888-8888,1985-06-20";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-membros.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4 py-12">
      {/* Geometria sagrada de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-5">
        <svg viewBox="0 0 800 800" className="w-full h-full">
          <circle cx="400" cy="400" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="400" cy="400" r="200" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="400" cy="400" r="100" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="300" cy="400" r="100" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="500" cy="400" r="100" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Church className="w-8 h-8 text-[#c9a84c]" />
            <span className="font-serif text-2xl text-[#1e3a5f] font-bold">Lampas</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1e3a5f] mb-2">
            Configuração Inicial
          </h1>
          <p className="text-[#1e3a5f]/60 font-light">
            Configure sua plataforma em 4 passos simples
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const done = progress?.[s.key];
              const active = i === currentStep;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      done
                        ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                        : active
                        ? "bg-white border-[#c9a84c] text-[#c9a84c]"
                        : "bg-white border-[#1e3a5f]/20 text-[#1e3a5f]/30"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-[#1e3a5f]" : "text-[#1e3a5f]/40"}`}>
                    {s.title.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-2 bg-[#1e3a5f]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#c9a84c] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#1e3a5f]/50">{completedSteps} de {STEPS.length} etapas concluídas</span>
            <span className="text-xs font-semibold text-[#c9a84c]">{progressPct}%</span>
          </div>
        </div>

        {/* Step Card */}
        <Card className={`border-2 ${step.bg} p-8 rounded-2xl shadow-lg`}>
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
              <StepIcon className={`w-7 h-7 ${step.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs border-[#1e3a5f]/20 text-[#1e3a5f]/60">
                  Passo {currentStep + 1} de {STEPS.length}
                </Badge>
                {progress?.[step.key] && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Concluído
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1e3a5f]">{step.title}</h2>
              <p className="text-[#1e3a5f]/60 text-sm">{step.subtitle}</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            {currentStep === 0 && (
              <div className="space-y-4">
                <p className="text-[#1e3a5f]/80 leading-relaxed">
                  Sua plataforma Lampas foi criada com sucesso! Nos próximos passos, vamos ajudá-lo a:
                </p>
                <ul className="space-y-3">
                  {[
                    { icon: Upload, text: "Importar sua lista de membros via CSV" },
                    { icon: Users, text: "Criar sua primeira célula de discipulado" },
                    { icon: UserPlus, text: "Convidar líderes e pastores para a plataforma" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <li key={i} className="flex items-center gap-3 text-[#1e3a5f]/70">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                          <Icon className="w-4 h-4 text-[#c9a84c]" />
                        </div>
                        <span className="text-sm">{item.text}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[#1e3a5f]/50 text-sm italic">
                  Você pode pular qualquer etapa e completar depois no painel de configurações.
                </p>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo CSV
                  </Button>
                  <span className="text-xs text-[#1e3a5f]/50">Preencha o modelo e faça upload</span>
                </div>
                <div
                  className="border-2 border-dashed border-[#1e3a5f]/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#c9a84c]/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-[#1e3a5f]/30 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/60 text-sm">
                    {csvRows.length > 0
                      ? `${csvRows.length} registros carregados — clique para trocar`
                      : "Clique para selecionar o arquivo CSV"}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVUpload}
                  />
                </div>
                {csvRows.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-[#1e3a5f]/10">
                    <p className="text-sm font-medium text-[#1e3a5f] mb-2">
                      Prévia ({Math.min(3, csvRows.length)} de {csvRows.length}):
                    </p>
                    {csvRows.slice(0, 3).map((r, i) => (
                      <div key={i} className="text-xs text-[#1e3a5f]/60 py-1 border-b border-[#1e3a5f]/5 last:border-0">
                        {r.fullName} {r.email ? `— ${r.email}` : ""}
                      </div>
                    ))}
                    <Button
                      className="w-full mt-3 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
                      onClick={handleImport}
                      disabled={importMutation.isPending}
                    >
                      {importMutation.isPending ? "Importando..." : `Importar ${csvRows.length} membros`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-[#1e3a5f]/70 text-sm">
                  Células são grupos de discipulado onde os membros crescem juntos. Crie sua primeira célula agora.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[#1e3a5f]/70 text-sm">Nome da Célula *</Label>
                    <Input
                      placeholder="Ex: Célula Esperança, Grupo da Manhã..."
                      value={cellName}
                      onChange={(e) => setCellName(e.target.value)}
                      className="mt-1 border-[#1e3a5f]/20 focus:border-[#c9a84c]"
                    />
                  </div>
                  <Button
                    className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
                    onClick={handleCreateCell}
                    disabled={createCellMutation.isPending || !cellName.trim()}
                  >
                    {createCellMutation.isPending ? "Criando..." : "Criar Célula"}
                  </Button>
                </div>
                {progress?.stepCreateCell && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Célula criada! Você pode criar mais em Células → Nova Célula.
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-[#1e3a5f]/70 text-sm">
                  Convide líderes, pastores e supervisores para acessar a plataforma. Eles receberão uma senha temporária.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[#1e3a5f]/70 text-sm">Nome *</Label>
                    <Input
                      placeholder="Nome completo do líder"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="mt-1 border-[#1e3a5f]/20 focus:border-[#c9a84c]"
                    />
                  </div>
                  <div>
                    <Label className="text-[#1e3a5f]/70 text-sm">Email *</Label>
                    <Input
                      type="email"
                      placeholder="email@lider.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="mt-1 border-[#1e3a5f]/20 focus:border-[#c9a84c]"
                    />
                  </div>
                  <Button
                    className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending || !inviteEmail.trim() || !inviteName.trim()}
                  >
                    {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
                  </Button>
                </div>
                {progress?.stepInviteLeaders && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Convite enviado! Você pode convidar mais em Configurações → Usuários.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep((s) => s - 1) : navigate("/dashboard")}
            className="border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Ir para o Dashboard" : "Anterior"}
          </Button>
          <Button
            onClick={handleNext}
            className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
          >
            {currentStep === STEPS.length - 1 ? "Concluir e ir ao Dashboard" : "Próximo"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Skip all */}
        <p className="text-center mt-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-[#1e3a5f]/40 hover:text-[#1e3a5f]/70 underline transition-colors"
          >
            Pular configuração e ir direto ao Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
