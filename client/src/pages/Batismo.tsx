import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { getWhatsAppLinkWithMessage } from "@/lib/whatsapp";
import { Droplets, Users, Award, Plus, Calendar, MapPin, User, Loader2, ChevronRight, MessageCircle, GraduationCap } from "lucide-react";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const STATUS_COLORS: Record<string, string> = {
  inscrito: "bg-blue-100 text-blue-800",
  participou: "bg-yellow-100 text-yellow-800",
  concluiu: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  inscrito: "Inscrito",
  participou: "Participou",
  concluiu: "Concluiu",
  cancelado: "Cancelado",
};

// Certificado PDF gerado via tRPC — ver BaptismClassCard para uso

function BaptismClassCard({ cls, churchId, people }: {
  cls: { id: number; name: string; date: string | Date; location?: string | null; pastor?: string | null; notes?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollMode, setEnrollMode] = useState<"existente" | "nova">("existente");
  const [newPerson, setNewPerson] = useState({ fullName: "", whatsapp: "", birthDate: "" });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  function resetEnrollForm() {
    setSelectedPersonId("");
    setNewPerson({ fullName: "", whatsapp: "", birthDate: "" });
    setEnrollMode("existente");
    setEnrollError(null);
  }

  const { data: enrollments } = trpc.batismo.getEnrollments.useQuery({ classId: cls.id, churchId });

  const enrollMutation = trpc.batismo.enroll.useMutation({
    onSuccess: () => {
      toast.success("Inscrição realizada!");
      setEnrollOpen(false);
      resetEnrollForm();
      utils.batismo.getEnrollments.invalidate();
    },
    onError: (error) => {
      setEnrollError(error.message || "Erro ao inscrever");
      toast.error(error.message || "Erro ao inscrever");
    },
  });

  const createPersonMutation = trpc.people.create.useMutation({
    onSuccess: (person) => {
      utils.people.list.invalidate();
      if (person?.id) {
        enrollMutation.mutate({ baptismClassId: cls.id, personId: person.id, churchId });
      } else {
        setEnrollError("Pessoa criada, mas não foi possível inscrevê-la. Tente pela lista de pessoas.");
      }
    },
    onError: (error) => {
      setEnrollError(error.message || "Erro ao cadastrar a pessoa");
      toast.error(error.message || "Erro ao cadastrar a pessoa");
    },
  });

  const enrollBusy = enrollMutation.isPending || createPersonMutation.isPending;

  function handleEnrollConfirm() {
    setEnrollError(null);
    if (enrollMode === "nova") {
      const fullName = newPerson.fullName.trim();
      const whatsapp = newPerson.whatsapp.trim();
      const birthDate = newPerson.birthDate.trim();
      if (fullName.length < 2) {
        setEnrollError("Informe o nome completo da pessoa.");
        return;
      }
      if (whatsapp.replace(/\D/g, "").length < 10) {
        setEnrollError("Informe um WhatsApp válido com DDD.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        setEnrollError("Informe a data de nascimento.");
        return;
      }
      createPersonMutation.mutate({ churchId, fullName, whatsapp, birthDate });
      return;
    }
    if (!selectedPersonId) return;
    enrollMutation.mutate({ baptismClassId: cls.id, personId: Number(selectedPersonId), churchId });
  }

  const updateMutation = trpc.batismo.updateEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.batismo.getEnrollments.invalidate();
    },
  });

  const [generatingCertFor, setGeneratingCertFor] = useState<number | null>(null);
  const certMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Certificado de batismo gerado!");
      setGeneratingCertFor(null);
    },
    onError: () => {
      toast.error("Erro ao gerar certificado");
      setGeneratingCertFor(null);
    },
  });

  const total = enrollments?.length ?? 0;
  const concluidos = enrollments?.filter((e) => e.enrollment.status === "concluiu").length ?? 0;

  return (
    <Card className="border border-[#06b6d4]/20 hover:border-[#06b6d4]/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div>
              <CardTitle className="text-[#1e3a5f] text-lg">{cls.name}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(cls.date).toLocaleDateString("pt-BR")}</span>
                {cls.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {cls.location}</span>}
                {cls.pastor && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {cls.pastor}</span>}
              </div>
            </div>
          </div>
          <Badge variant={cls.active ? "default" : "secondary"}>{cls.active ? "Ativo" : "Encerrado"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {cls.notes && <p className="text-sm text-muted-foreground mb-4">{cls.notes}</p>}
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} inscritos</span>
          <span className="flex items-center gap-1 text-green-600"><Award className="h-4 w-4" /> {concluidos} batizados</span>
        </div>

        {enrollments && enrollments.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {enrollments.map(({ enrollment, person, discipler }) => {
              const disciplerName = discipler?.fullName ?? null;
              const disciplerContact = discipler?.whatsapp ?? discipler?.phone ?? null;
              const disciplerWaLink = disciplerName && disciplerContact
                ? getWhatsAppLinkWithMessage(disciplerContact, `Olá, ${firstName(disciplerName)}! Aqui é da equipe de batismo da igreja. Gostaria de falar com você sobre o batismo de ${person.fullName}.`)
                : null;
              return (
              <div key={enrollment.id} className="rounded bg-muted/30 p-2">
                <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/app/pessoas?personId=${person.id}&section=resumo`)}
                  className="group flex min-w-0 items-center gap-1 text-left text-sm font-medium text-[#1e3a5f] transition-colors hover:text-[#06b6d4] active:scale-[0.99]"
                  title="Ver dados da pessoa"
                >
                  <span className="truncate">{person.fullName}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[enrollment.status ?? "inscrito"]}`}>
                    {STATUS_LABELS[enrollment.status ?? "inscrito"]}
                  </span>
                  {enrollment.status !== "concluiu" && enrollment.status !== "cancelado" && (
                    <Select
                      value={enrollment.status ?? "inscrito"}
                      onValueChange={(val) =>
                        updateMutation.mutate({
                          id: enrollment.id,
                          churchId,
                          status: val as "inscrito" | "participou" | "concluiu" | "cancelado",
                          completedAt: val === "concluiu" ? new Date() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscrito">Inscrito</SelectItem>
                        <SelectItem value="participou">Participou</SelectItem>
                        <SelectItem value="concluiu">Concluiu</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {enrollment.status === "concluiu" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-[#06b6d4] text-[#06b6d4]"
                      disabled={generatingCertFor === enrollment.id}
                      onClick={() => {
                        setGeneratingCertFor(enrollment.id);
                        certMutation.mutate({
                          type: "batismo",
                          memberName: person.fullName,
                          churchId,
                          personId: person.id,
                          enrollmentId: enrollment.id,
                          pastorName: cls.pastor ?? undefined,
                          date: String(cls.date),
                        });
                      }}
                    >
                      {generatingCertFor === enrollment.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Award className="h-3 w-3 mr-1" />}
                      Certificado
                    </Button>
                  )}
                </div>
                </div>
                {disciplerName && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 truncate">Discipulador: {disciplerName}</span>
                    {disciplerWaLink ? (
                      <a
                        href={disciplerWaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-green-600/40 px-2 py-0.5 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-50 active:scale-[0.98]"
                        title={`Falar com ${firstName(disciplerName)} no WhatsApp`}
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    ) : (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/70">sem contato</span>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        <Dialog open={enrollOpen} onOpenChange={(nextOpen) => { setEnrollOpen(nextOpen); if (nextOpen) resetEnrollForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
              <Plus className="h-4 w-4 mr-1" /> Inscrever Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Inscrever em {cls.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {enrollError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{enrollError}</div>}
              <div className="inline-flex w-full rounded-full border border-border bg-muted/30 p-0.5 text-xs">
                {([
                  { key: "existente", label: "Pessoa já cadastrada" },
                  { key: "nova", label: "Nova pessoa" },
                ] as { key: "existente" | "nova"; label: string }[]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setEnrollError(null); setEnrollMode(tab.key); }}
                    className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors active:scale-[0.98] ${enrollMode === tab.key ? "bg-[#1e3a5f] text-white shadow-sm" : "text-muted-foreground hover:text-[#1e3a5f]"}`}
                    aria-pressed={enrollMode === tab.key}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {enrollMode === "existente" ? (
                <Select value={selectedPersonId} onValueChange={(value) => { setEnrollError(null); setSelectedPersonId(value); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a pessoa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Nome completo *</Label>
                    <Input value={newPerson.fullName} onChange={(e) => { setEnrollError(null); setNewPerson({ ...newPerson, fullName: e.target.value }); }} placeholder="Nome da pessoa" />
                  </div>
                  <div>
                    <Label>WhatsApp *</Label>
                    <Input value={newPerson.whatsapp} onChange={(e) => { setEnrollError(null); setNewPerson({ ...newPerson, whatsapp: e.target.value }); }} placeholder="(11) 99999-9999" inputMode="tel" />
                  </div>
                  <div>
                    <Label>Data de nascimento *</Label>
                    <Input type="date" value={newPerson.birthDate} onChange={(e) => { setEnrollError(null); setNewPerson({ ...newPerson, birthDate: e.target.value }); }} />
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">A pessoa será cadastrada na igreja (sem login) e inscrita nesta turma. Você pode completar os demais dados depois em Pessoas.</p>
                </div>
              )}
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={enrollBusy || (enrollMode === "existente" ? !selectedPersonId : newPerson.fullName.trim().length < 2 || newPerson.whatsapp.replace(/\D/g, "").length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(newPerson.birthDate))}
                onClick={handleEnrollConfirm}
              >
                {enrollBusy ? "Inscrevendo..." : enrollMode === "nova" ? "Cadastrar e inscrever" : "Confirmar Inscrição"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function Batismo() {
  const { churchId, accessSummary } = useChurch();
  const canManageStudy = Boolean(accessSummary?.canManageChurch);
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", location: "", pastor: "", notes: "" });
  const [studyPickerId, setStudyPickerId] = useState("");
  const utils = trpc.useUtils();

  const { data: classes, isLoading } = trpc.batismo.listClasses.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: studyRef } = trpc.batismo.studyRef.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: availableStudies } = trpc.batismo.availableStudies.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId && canManageStudy }
  );
  const setStudyMutation = trpc.batismo.setStudy.useMutation({
    onSuccess: () => {
      utils.batismo.studyRef.invalidate();
      setStudyPickerId("");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o estudo de batismo."),
  });

  const createMutation = trpc.batismo.createClass.useMutation({
    onSuccess: () => {
      toast.success("Turma de batismo criada!");
      setCreateOpen(false);
      setForm({ name: "", date: "", location: "", pastor: "", notes: "" });
      utils.batismo.listClasses.invalidate();
    },
    onError: () => toast.error("Erro ao criar turma"),
  });

  if (!churchId) return null;
  const simplePeople = (people ?? []).map((p) => ({ id: p.id, fullName: p.fullName }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Droplets className="h-6 w-6 text-[#06b6d4]" />
            Batismo nas Águas
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de turmas de batismo e certificados</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Turma de Batismo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome da Turma *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Batismo Julho 2025" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Rio, Lago, Piscina..." />
              </div>
              <div>
                <Label>Pastor(a) Responsável</Label>
                <Input value={form.pastor} onChange={(e) => setForm({ ...form, pastor: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.name || !form.date || createMutation.isPending}
                onClick={() => createMutation.mutate({ churchId: churchId!, ...form })}
              >
                {createMutation.isPending ? "Criando..." : "Criar Turma"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="rounded-2xl border border-[#06b6d4]/25 bg-gradient-to-br from-[#06b6d4]/10 via-background to-background p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#06b6d4]/15 text-[#06b6d4]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1e3a5f]">Preparação para o batismo</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Monte e acompanhe o estudo de batismo dos candidatos na Escola de Fundamentos, com progresso por aula.
            </p>
            {studyRef ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/app/escola-fundamentos?courseId=${studyRef.courseId}&studyId=${studyRef.studyId}`)}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1e3a5f]/90 active:scale-[0.98]"
                >
                  Abrir estudo: {studyRef.title}
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
                {canManageStudy && (
                  <button
                    type="button"
                    onClick={() => setStudyMutation.mutate({ churchId, studyId: null })}
                    disabled={setStudyMutation.isPending}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    Remover
                  </button>
                )}
              </div>
            ) : canManageStudy && (availableStudies?.length ?? 0) > 0 ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <Label className="text-[11px] text-muted-foreground">Escolha o estudo de batismo</Label>
                  <Select value={studyPickerId} onValueChange={setStudyPickerId}>
                    <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Selecione um estudo..." /></SelectTrigger>
                    <SelectContent>
                      {(availableStudies ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-[#1e3a5f] text-white"
                  disabled={!studyPickerId || setStudyMutation.isPending}
                  onClick={() => setStudyMutation.mutate({ churchId, studyId: Number(studyPickerId) })}
                >
                  Definir
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/app/escola-fundamentos")}
                className="group mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#06b6d4]/40 px-3 py-1.5 text-xs font-semibold text-[#06b6d4] transition-colors hover:bg-[#06b6d4]/10 active:scale-[0.98]"
              >
                Abrir Escola de Fundamentos
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Card key={i} className="animate-pulse h-48 bg-muted/30" />)}
        </div>
      ) : classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <BaptismClassCard key={cls.id} cls={cls} churchId={churchId!} people={simplePeople} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#06b6d4]/30">
          <CardContent className="p-12 text-center">
            <Droplets className="h-12 w-12 text-[#06b6d4]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma turma de batismo</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie a primeira turma de batismo para começar a registrar os candidatos.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Criar Primeira Turma
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
