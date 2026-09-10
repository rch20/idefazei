import { useChurch } from "@/components/ChurchLayout";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, FileText, GraduationCap, Loader2, Lock, Plus, Save, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS = { rascunho: "Rascunho", publicada: "Publicada", concluida: "Concluída" } as const;
const ATTENDANCE_LABELS = { presente: "Presente", ausente: "Ausente", justificado: "Justificado" } as const;

type Lesson = { id: number; classId: number; title: string; summary?: string | null; content?: string | null; lessonDate?: string | Date | null; position: number; status: keyof typeof STATUS_LABELS };
type RosterRow = { enrollment: { id: number; status: string }; person: { id: number; fullName: string }; attendance?: { status: keyof typeof ATTENDANCE_LABELS; note?: string | null } | null; progress?: { reviewStatus: string; reviewNotes?: string | null; releasedAt?: string | Date | null; status: string } | null };

function civilDate(value?: string | Date | null) {
  if (!value) return "Data não definida";
  const text = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = text.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "Data não definida";
}

export default function EscolaLideresProfessor() {
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", summary: "", content: "", lessonDate: "", status: "rascunho" as Lesson["status"] });
  const [attendanceDraft, setAttendanceDraft] = useState<Record<number, keyof typeof ATTENDANCE_LABELS>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<number, "compreendeu" | "precisa_reforco" | "nao_participou">>({});
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const access = trpc.escolaLideres.access.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId), retry: false });
  const classes = trpc.escolaLideres.teacherClasses.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && access.data), retry: false });
  const lessons = trpc.escolaLideres.lessons.useQuery({ churchId: churchId!, classId: Number(selectedClassId) }, { enabled: Boolean(churchId && selectedClassId && access.data), retry: false });
  const selectedLesson = useMemo(() => (lessons.data ?? []).find((lesson) => String(lesson.id) === selectedLessonId) as Lesson | undefined, [lessons.data, selectedLessonId]);
  const roster = trpc.escolaLideres.lessonRoster.useQuery({ churchId: churchId!, lessonId: Number(selectedLessonId) }, { enabled: Boolean(churchId && selectedLessonId && access.data), retry: false });

  useEffect(() => {
    if (classes.data?.[0] && !classes.data.some((item) => String(item.id) === selectedClassId)) setSelectedClassId(String(classes.data[0].id));
  }, [classes.data, selectedClassId]);
  useEffect(() => {
    if (lessons.data?.[0] && !lessons.data.some((item) => String(item.id) === selectedLessonId)) setSelectedLessonId(String(lessons.data[0].id));
  }, [lessons.data, selectedLessonId]);
  useEffect(() => {
    const rows = (roster.data ?? []) as RosterRow[];
    setAttendanceDraft(Object.fromEntries(rows.map((row) => [row.enrollment.id, row.attendance?.status ?? "presente"])));
    setReviewStatus(Object.fromEntries(rows.map((row) => [row.enrollment.id, (row.progress?.reviewStatus === "precisa_reforco" || row.progress?.reviewStatus === "nao_participou" ? row.progress.reviewStatus : "compreendeu")] )));
    setReviewNotes(Object.fromEntries(rows.map((row) => [row.enrollment.id, row.progress?.reviewNotes ?? ""])));
  }, [roster.data, selectedLessonId]);

  const createLesson = trpc.escolaLideres.createLesson.useMutation({ onSuccess: async () => { toast.success("Aula criada."); setLessonOpen(false); await utils.escolaLideres.lessons.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateLesson = trpc.escolaLideres.updateLesson.useMutation({ onSuccess: async () => { toast.success("Aula atualizada."); await utils.escolaLideres.lessons.invalidate(); }, onError: (error) => toast.error(error.message) });
  const saveAttendance = trpc.escolaLideres.saveAttendance.useMutation({ onSuccess: async () => { toast.success("Presença salva."); await utils.escolaLideres.lessonRoster.invalidate(); }, onError: (error) => toast.error(error.message) });
  const reviewProgress = trpc.escolaLideres.reviewProgress.useMutation({ onSuccess: async () => { toast.success("Revisão registrada."); await utils.escolaLideres.lessonRoster.invalidate(); }, onError: (error) => toast.error(error.message) });
  const releaseNextLesson = trpc.escolaLideres.releaseNextLesson.useMutation({ onSuccess: async () => { toast.success("Próximo tema liberado para o aluno."); await utils.escolaLideres.lessonRoster.invalidate(); }, onError: (error) => toast.error(error.message) });

  if (!churchId) return null;
  if (access.isLoading) return <div className="p-6"><div className="h-48 animate-pulse rounded-2xl bg-muted/30" /></div>;
  if (access.isError || !access.data?.canTeach) return <div className="mx-auto max-w-xl p-6"><Card><CardContent className="p-8 text-center"><Lock className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="mt-4 font-display text-xl text-navy">Painel restrito</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Você precisa ser atribuído como professor de uma turma da Escola de Líderes.</p></CardContent></Card></div>;

  const openNewLesson = () => { setLessonForm({ title: "", summary: "", content: "", lessonDate: "", status: "rascunho" }); setLessonOpen(true); };
  const openEditLesson = () => { if (!selectedLesson) return; setLessonForm({ title: selectedLesson.title, summary: selectedLesson.summary ?? "", content: selectedLesson.content ?? "", lessonDate: typeof selectedLesson.lessonDate === "string" ? selectedLesson.lessonDate.slice(0, 10) : selectedLesson.lessonDate ? selectedLesson.lessonDate.toISOString().slice(0, 10) : "", status: selectedLesson.status }); setLessonOpen(true); };
  const saveLesson = (event: React.FormEvent) => { event.preventDefault(); if (!selectedClassId || lessonForm.title.trim().length < 3) return; if (selectedLesson) updateLesson.mutate({ churchId, id: selectedLesson.id, ...lessonForm, summary: lessonForm.summary || null, content: lessonForm.content || null, lessonDate: lessonForm.lessonDate || null }); else createLesson.mutate({ churchId, classId: Number(selectedClassId), ...lessonForm, summary: lessonForm.summary || null, content: lessonForm.content || null, lessonDate: lessonForm.lessonDate || null }); };

  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-2xl bg-[#1e3a5f] p-3 text-white"><GraduationCap className="h-6 w-6" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a84c]">Escola de Líderes</p><h1 className="font-display text-2xl text-[#1e3a5f]">Painel do Professor</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Registre cada encontro, faça a chamada e acompanhe a formação sem misturar com a gestão da igreja.</p></div></div><Badge variant="secondary">{access.data.canManage ? "Gestão e docência" : "Professor atribuído"}</Badge></header>

    <Card className="border-[#c9a84c]/25 bg-[#fdfaf1]/60"><CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div className="space-y-2"><Label>Turma</Label><Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedLessonId(""); }}><SelectTrigger><SelectValue placeholder="Selecione uma turma" /></SelectTrigger><SelectContent>{(classes.data ?? []).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><Button type="button" onClick={openNewLesson} disabled={!selectedClassId}><Plus className="mr-2 h-4 w-4" />Nova aula</Button></CardContent></Card>

    {!classes.data?.length ? <Card><CardContent className="p-8 text-center"><Users className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 font-semibold text-navy">Nenhuma turma atribuída</p><p className="mt-1 text-sm text-muted-foreground">A liderança precisa atribuir você a uma turma para começar.</p></CardContent></Card> : <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-[#1e3a5f]"><FileText className="h-4 w-4 text-[#c9a84c]" />Aulas da turma</CardTitle></CardHeader><CardContent className="space-y-2">{(lessons.data ?? []).map((lesson) => <button key={lesson.id} type="button" onClick={() => setSelectedLessonId(String(lesson.id))} className={`w-full rounded-xl border p-3 text-left transition ${String(lesson.id) === selectedLessonId ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border bg-background hover:border-[#c9a84c]"}`}><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/20 text-sm font-bold text-[#1e3a5f]">{lesson.position + 1}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-[#1e3a5f]">{lesson.title}</span><span className="mt-1 block text-xs text-muted-foreground">{civilDate(lesson.lessonDate)}</span></span><Badge variant={lesson.status === "concluida" ? "default" : "secondary"}>{STATUS_LABELS[lesson.status]}</Badge></div></button>)}{!lessons.data?.length ? <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Ainda não há aulas. Crie o primeiro encontro.</p> : null}</CardContent></Card>

      <Card><CardHeader className="flex flex-row items-start justify-between gap-3 pb-3"><div><CardTitle className="flex items-center gap-2 text-base text-[#1e3a5f]"><ClipboardCheck className="h-4 w-4 text-[#c9a84c]" />Diário do encontro</CardTitle>{selectedLesson ? <p className="mt-1 text-sm font-normal text-muted-foreground">{selectedLesson.title} · {civilDate(selectedLesson.lessonDate)}</p> : <p className="mt-1 text-sm font-normal text-muted-foreground">Selecione uma aula para registrar a turma.</p>}</div>{selectedLesson ? <Button size="sm" variant="outline" onClick={openEditLesson}>Editar</Button> : null}</CardHeader><CardContent className="space-y-4">{selectedLesson && (roster.data ?? []).length ? <div className="space-y-3">{(roster.data as RosterRow[]).map((row) => <div key={row.enrollment.id} className="rounded-xl border border-border bg-background p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-[#1e3a5f]">{row.person.fullName}</p><p className="text-xs text-muted-foreground">{row.progress?.releasedAt ? "Próximo tema liberado" : "Aguardando acompanhamento"}</p></div><Select value={attendanceDraft[row.enrollment.id] ?? "presente"} onValueChange={(value) => { const status = value as keyof typeof ATTENDANCE_LABELS; setAttendanceDraft((current) => ({ ...current, [row.enrollment.id]: status })); saveAttendance.mutate({ churchId, lessonId: selectedLesson.id, enrollmentId: row.enrollment.id, status }); }}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ATTENDANCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="mt-3 space-y-2 border-t border-border pt-3"><Label>Avaliação da revisão presencial</Label><div className="grid gap-2 sm:grid-cols-3">{(["compreendeu", "precisa_reforco", "nao_participou"] as const).map((value) => <Button key={value} type="button" size="sm" variant={(reviewStatus[row.enrollment.id] ?? "compreendeu") === value ? "default" : "outline"} onClick={() => setReviewStatus((current) => ({ ...current, [row.enrollment.id]: value }))}>{value === "compreendeu" ? "Compreendeu" : value === "precisa_reforco" ? "Precisa de reforço" : "Não participou"}</Button>)}</div><Textarea value={reviewNotes[row.enrollment.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [row.enrollment.id]: event.target.value }))} rows={2} maxLength={2000} placeholder="Observação da revisão presencial (opcional)" /><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" size="sm" variant="outline" disabled={reviewProgress.isPending} onClick={() => reviewProgress.mutate({ churchId, lessonId: selectedLesson.id, enrollmentId: row.enrollment.id, reviewStatus: reviewStatus[row.enrollment.id] ?? "compreendeu", reviewNotes: reviewNotes[row.enrollment.id] || null })}><Save className="mr-1 h-3.5 w-3.5" />Registrar revisão</Button><Button type="button" size="sm" disabled={releaseNextLesson.isPending || (reviewStatus[row.enrollment.id] ?? row.progress?.reviewStatus) !== "compreendeu"} onClick={() => releaseNextLesson.mutate({ churchId, lessonId: selectedLesson.id, enrollmentId: row.enrollment.id })}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Liberar próximo tema</Button></div></div></div>)}</div> : selectedLesson ? <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Não há alunos matriculados nesta turma.</p> : <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Escolha uma aula para abrir o diário.</p>}</CardContent></Card>
    </div>}

    <Dialog open={lessonOpen} onOpenChange={setLessonOpen}><AdaptiveFormDialogContent><div className={adaptiveFormDialogHeaderClassName}><DialogHeader><DialogTitle>{selectedLesson ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader><p className="mt-1 text-sm text-muted-foreground">O professor registra o encontro; a estrutura da igreja permanece protegida.</p></div><form className="contents" onSubmit={saveLesson}><AdaptiveFormDialogBody className="space-y-4"><div className="space-y-2"><Label htmlFor="leadership-lesson-title">Título da aula *</Label><Input id="leadership-lesson-title" value={lessonForm.title} onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))} maxLength={160} placeholder="Ex.: Identidade e caráter do líder" /></div><div className="space-y-2"><Label>Data do encontro</Label><Input type="date" value={lessonForm.lessonDate} onChange={(event) => setLessonForm((current) => ({ ...current, lessonDate: event.target.value }))} /></div><div className="space-y-2"><Label>Objetivo ou resumo</Label><Input value={lessonForm.summary} onChange={(event) => setLessonForm((current) => ({ ...current, summary: event.target.value }))} maxLength={500} /></div><div className="space-y-2"><Label>Roteiro do encontro</Label><Textarea value={lessonForm.content} onChange={(event) => setLessonForm((current) => ({ ...current, content: event.target.value }))} maxLength={12000} rows={7} placeholder="Pontos, textos bíblicos, perguntas e aplicação prática." /></div><div className="space-y-2"><Label>Status</Label><Select value={lessonForm.status} onValueChange={(value) => setLessonForm((current) => ({ ...current, status: value as Lesson["status"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => setLessonOpen(false)}>Cancelar</Button><Button type="submit" disabled={createLesson.isPending || updateLesson.isPending || lessonForm.title.trim().length < 3}>{createLesson.isPending || updateLesson.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar aula</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent></Dialog>
  </div>;
}

export {};
