import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { uploadChurchMedia } from "@/lib/mediaUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, ExternalLink, FileDown, FileText, FileUp, Link2, Loader2, Pencil, Plus, ShieldCheck, Trash2, Upload, X } from "lucide-react";

const STATUS_LABELS = { rascunho: "Rascunho", publicado: "Publicado", arquivado: "Arquivado" } as const;

type Attachment = {
  id: number;
  title: string;
  kind: "arquivo" | "link";
  url: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  position: number;
};

type Study = {
  id: number;
  title: string;
  weekStart: string;
  biblicalText: string | null;
  objective: string | null;
  introduction: string | null;
  development: string | null;
  discussionQuestions: string | null;
  practicalApplication: string | null;
  prayer: string | null;
  status: "rascunho" | "publicado" | "arquivado";
};

type StudyWithAttachments = { study: Study; attachments: Attachment[] };

function formatWeek(value: string) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function AttachmentList({ studyId, attachments, canManage, churchId, onChanged }: { studyId: number; attachments: Attachment[]; canManage: boolean; churchId: number; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const attachFile = trpc.cellStudies.attachFile.useMutation({ onSuccess: () => { toast.success("Arquivo anexado ao estudo."); setTargetFile(null); setUploading(false); onChanged(); }, onError: (error) => { setUploading(false); toast.error(error.message); } });
  const attachLink = trpc.cellStudies.attachLink.useMutation({ onSuccess: () => { toast.success("Link anexado ao estudo."); setLinkTitle(""); setLinkUrl(""); setShowLink(false); onChanged(); }, onError: (error) => toast.error(error.message) });
  const deleteAttachment = trpc.cellStudies.deleteAttachment.useMutation({ onSuccess: () => { toast.success("Anexo removido."); onChanged(); }, onError: (error) => toast.error(error.message) });
  const uploadSelectedFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 20 MB.");
    setTargetFile(file); setUploading(true);
    try {
      const resourceType = file.type.startsWith("image/") ? "image" : "raw";
      const uploaded = await uploadChurchMedia(file, { purpose: "cell_study_attachment", resourceType });
      if (!uploaded.mediaAssetId) throw new Error("O armazenamento não retornou o identificador do arquivo.");
      attachFile.mutate({ churchId, studyId, title: file.name.replace(/\.[^.]+$/, ""), mediaAssetId: uploaded.mediaAssetId, url: uploaded.url, mimeType: file.type, originalFilename: file.name });
    } catch (error) { setUploading(false); setTargetFile(null); toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo."); }
  };
  return <div className="mt-4 rounded-xl border border-[#c9a84c]/20 bg-[#fdfaf1] p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]"><FileText className="h-4 w-4 text-[#c9a84c]" />Materiais do estudo</p>{canManage ? <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.ogg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSelectedFile(file); event.target.value = ""; }} /><Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}Arquivo</Button><Button type="button" size="sm" variant="outline" onClick={() => setShowLink((value) => !value)}><Link2 className="mr-1 h-3.5 w-3.5" />Link externo</Button></div> : null}</div>
    {targetFile && uploading ? <p className="mb-2 text-xs text-muted-foreground">Enviando {targetFile.name}…</p> : null}
    {showLink ? <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><Input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Nome do material" /><Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://…" inputMode="url" /><Button type="button" disabled={linkTitle.trim().length < 2 || !linkUrl.startsWith("https://") || attachLink.isPending} onClick={() => attachLink.mutate({ churchId, studyId, title: linkTitle, url: linkUrl })}>Adicionar</Button></div> : null}
    {attachments.length ? <div className="space-y-2">{attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"><a className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#1e3a5f] hover:underline" href={attachment.url ?? "#"} target="_blank" rel="noopener noreferrer"><span className="shrink-0">{attachment.kind === "link" ? <ExternalLink className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}</span><span className="truncate">{attachment.title}</span></a><div className="flex shrink-0 items-center gap-2">{attachment.position === 0 ? <Badge variant="outline" className="hidden whitespace-nowrap border-[#c9a84c]/50 text-[10px] text-[#8a6b16] sm:inline-flex">Material principal</Badge> : null}{canManage ? <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`Remover ${attachment.title}`} onClick={() => deleteAttachment.mutate({ churchId, studyId, id: attachment.id })}><Trash2 className="h-4 w-4" /></Button> : null}</div></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum material complementar anexado.</p>}
  </div>;
}

export default function EstudosCelulas() {
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const { data: access, isLoading: accessLoading } = trpc.cellStudies.access.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId) });
  const canManage = Boolean(access?.canManageStudies);
  const canRead = Boolean(access?.canReadPublishedStudies);
  const { data: studyRows = [], isLoading } = trpc.cellStudies.list.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && canRead) });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [biblicalText, setBiblicalText] = useState("");
  const [objective, setObjective] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [development, setDevelopment] = useState("");
  const [discussionQuestions, setDiscussionQuestions] = useState("");
  const [practicalApplication, setPracticalApplication] = useState("");
  const [prayer, setPrayer] = useState("");
  const [showForm, setShowForm] = useState(false);
  const readyFileRef = useRef<HTMLInputElement>(null);
  const [showReadyForm, setShowReadyForm] = useState(false);
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const [readyTitle, setReadyTitle] = useState("");
  const [readyWeekStart, setReadyWeekStart] = useState("");
  const [readyBiblicalText, setReadyBiblicalText] = useState("");
  const [readyObservation, setReadyObservation] = useState("");
  const [readySaving, setReadySaving] = useState(false);
  const [administratorId, setAdministratorId] = useState("");
  const invalidate = () => { utils.cellStudies.list.invalidate(); utils.cellStudies.access.invalidate(); };
  const createStudy = trpc.cellStudies.create.useMutation({ onSuccess: () => { toast.success("Estudo criado como rascunho."); clearForm(); invalidate(); }, onError: (error) => toast.error(error.message) });
  const createReadyStudy = trpc.cellStudies.createReady.useMutation();
  const updateStudy = trpc.cellStudies.update.useMutation({ onSuccess: () => { toast.success("Estudo atualizado."); clearForm(); invalidate(); }, onError: (error) => toast.error(error.message) });
  const assignAdministrator = trpc.cellStudies.assignAdministrator.useMutation({ onSuccess: () => { toast.success("Responsável autorizado."); setAdministratorId(""); utils.cellStudies.listAdministrators.invalidate(); }, onError: (error) => toast.error(error.message) });
  const removeAdministrator = trpc.cellStudies.removeAdministrator.useMutation({ onSuccess: () => { toast.success("Responsável removido."); utils.cellStudies.listAdministrators.invalidate(); }, onError: (error) => toast.error(error.message) });
  const { data: administrators = [] } = trpc.cellStudies.listAdministrators.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && canManage) });
  const { data: accounts = [] } = trpc.churchAuth.listUsers.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && access?.canAssignAdministrators) });
  const rows = studyRows as StudyWithAttachments[];
  const clearForm = () => { setEditingId(null); setTitle(""); setWeekStart(""); setBiblicalText(""); setObjective(""); setIntroduction(""); setDevelopment(""); setDiscussionQuestions(""); setPracticalApplication(""); setPrayer(""); setShowForm(false); };
  const clearReadyForm = () => { setReadyFile(null); setReadyTitle(""); setReadyWeekStart(""); setReadyBiblicalText(""); setReadyObservation(""); setShowReadyForm(false); if (readyFileRef.current) readyFileRef.current.value = ""; };
  const beginEdit = (study: Study) => { setEditingId(study.id); setTitle(study.title); setWeekStart(String(study.weekStart).slice(0, 10)); setBiblicalText(study.biblicalText ?? ""); setObjective(study.objective ?? ""); setIntroduction(study.introduction ?? ""); setDevelopment(study.development ?? ""); setDiscussionQuestions(study.discussionQuestions ?? ""); setPracticalApplication(study.practicalApplication ?? ""); setPrayer(study.prayer ?? ""); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const save = () => {
    if (title.trim().length < 3) return toast.error("Informe um título com ao menos 3 caracteres.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return toast.error("Informe a semana de aplicação.");
    const payload = { churchId: churchId!, title, weekStart, biblicalText: biblicalText || undefined, objective: objective || undefined, introduction: introduction || undefined, development: development || undefined, discussionQuestions: discussionQuestions || undefined, practicalApplication: practicalApplication || undefined, prayer: prayer || undefined };
    if (editingId) updateStudy.mutate({ id: editingId, ...payload }); else createStudy.mutate(payload);
  };
  const saveReadyStudy = async (publish: boolean) => {
    if (!readyFile) return toast.error("Selecione o arquivo do estudo pronto.");
    if (readyTitle.trim().length < 3) return toast.error("Informe um título com ao menos 3 caracteres.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(readyWeekStart)) return toast.error("Informe a semana de aplicação.");
    if (readyFile.size > 20 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 20 MB.");
    setReadySaving(true);
    try {
      const resourceType = readyFile.type.startsWith("image/") ? "image" : "raw";
      const uploaded = await uploadChurchMedia(readyFile, { purpose: "cell_study_attachment", resourceType });
      if (!uploaded.mediaAssetId || !uploaded.url) throw new Error("O armazenamento não retornou os dados do arquivo.");
      await createReadyStudy.mutateAsync({
        churchId: churchId!,
        title: readyTitle,
        weekStart: readyWeekStart,
        biblicalText: readyBiblicalText.trim() || undefined,
        observation: readyObservation.trim() || undefined,
        mediaAssetId: uploaded.mediaAssetId,
        url: uploaded.url,
        mimeType: readyFile.type || undefined,
        originalFilename: readyFile.name,
        publish,
      });
      toast.success(publish ? "Estudo pronto publicado para os líderes." : "Estudo pronto salvo como rascunho.");
      clearReadyForm();
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir o envio. O arquivo não foi publicado.");
    } finally {
      setReadySaving(false);
    }
  };
  if (!churchId) return null;
  if (accessLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando acesso aos estudos…</div>;
  if (!canRead && !canManage) return <div className="p-4 sm:p-6"><Card className="border-dashed border-[#c9a84c]/30"><CardContent className="p-10 text-center"><BookOpen className="mx-auto mb-4 h-12 w-12 text-[#c9a84c]/50" /><h1 className="text-xl font-semibold text-[#1e3a5f]">Estudos de Células</h1><p className="mt-2 text-sm text-muted-foreground">Esta área é destinada ao Pastor, aos responsáveis pelos estudos e aos líderes de Célula.</p></CardContent></Card></div>;
  return <div className="space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e3a5f]"><BookOpen className="h-6 w-6 text-[#c9a84c]" />Estudos de Células</h1><p className="mt-1 max-w-2xl text-muted-foreground">Estudos semanais oficiais para preparar e aplicar nos encontros das Células.</p></div>{canManage ? <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="w-full border-[#c9a84c] text-[#1e3a5f] sm:w-auto" onClick={() => { clearForm(); setShowReadyForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><FileUp className="mr-2 h-4 w-4 text-[#c9a84c]" />Adicionar estudo pronto</Button><Button type="button" className="w-full bg-[#1e3a5f] text-white sm:w-auto" onClick={() => { clearReadyForm(); clearForm(); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />Novo estudo</Button></div> : null}</div>
    {canManage && showReadyForm ? <Card className="border-[#c9a84c]/40 bg-[#fffdf7]"><CardHeader><CardTitle className="flex items-center justify-between text-[#1e3a5f]"><span>Adicionar estudo pronto</span><Button type="button" size="icon" variant="ghost" onClick={clearReadyForm} aria-label="Fechar formulário de estudo pronto"><X className="h-4 w-4" /></Button></CardTitle><p className="text-sm font-normal text-muted-foreground">Envie um estudo elaborado no Word, Canva, PowerPoint ou outro programa. O PDF é o formato recomendado para o material principal.</p></CardHeader><CardContent className="space-y-4"><input ref={readyFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.ogg" onChange={(event) => { const file = event.target.files?.[0] ?? null; setReadyFile(file); if (file && !readyTitle) setReadyTitle(file.name.replace(/\.[^.]+$/, "")); event.target.value = ""; }} /><button type="button" className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c9a84c]/50 bg-white px-4 py-6 text-center transition hover:border-[#1e3a5f]" onClick={() => readyFileRef.current?.click()}><Upload className="mb-2 h-7 w-7 text-[#c9a84c]" /><span className="font-semibold text-[#1e3a5f]">{readyFile ? readyFile.name : "Selecionar arquivo do estudo"}</span><span className="mt-1 text-xs text-muted-foreground">PDF recomendado · até 20 MB · também aceita DOC, PPT, TXT, imagens e áudio</span></button><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]"><div className="space-y-2"><Label htmlFor="ready-cell-study-title">Título do estudo</Label><Input id="ready-cell-study-title" value={readyTitle} onChange={(event) => setReadyTitle(event.target.value)} placeholder="Ex.: Permanecer em Cristo" maxLength={180} /></div><div className="space-y-2"><Label htmlFor="ready-cell-study-week">Semana de aplicação</Label><Input id="ready-cell-study-week" type="date" value={readyWeekStart} onChange={(event) => setReadyWeekStart(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="ready-cell-study-bible">Texto bíblico base <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="ready-cell-study-bible" value={readyBiblicalText} onChange={(event) => setReadyBiblicalText(event.target.value)} placeholder="Ex.: João 15:1–8" maxLength={500} /></div><div className="space-y-2"><Label htmlFor="ready-cell-study-observation">Orientação para o líder <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="ready-cell-study-observation" value={readyObservation} onChange={(event) => setReadyObservation(event.target.value)} placeholder="Uma observação curta para acompanhar o arquivo enviado." maxLength={4000} /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={clearReadyForm} disabled={readySaving}>Cancelar</Button><Button type="button" variant="outline" disabled={readySaving} onClick={() => void saveReadyStudy(false)}>{readySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar como rascunho</Button><Button type="button" className="bg-[#1e3a5f] text-white" disabled={readySaving} onClick={() => void saveReadyStudy(true)}>{readySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Publicar para líderes</Button></div></CardContent></Card> : null}
    {canManage && showForm ? <Card className="border-[#c9a84c]/30"><CardHeader><CardTitle className="flex items-center justify-between text-[#1e3a5f]"><span>{editingId ? "Editar estudo" : "Novo estudo semanal"}</span><Button type="button" size="icon" variant="ghost" onClick={clearForm} aria-label="Fechar formulário"><X className="h-4 w-4" /></Button></CardTitle><p className="text-sm font-normal text-muted-foreground">O conteúdo fica em rascunho até o responsável publicá-lo.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]"><div className="space-y-2"><Label htmlFor="cell-study-title">Título do estudo</Label><Input id="cell-study-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Permanecer em Cristo" maxLength={180} /></div><div className="space-y-2"><Label htmlFor="cell-study-week">Semana de aplicação</Label><Input id="cell-study-week" type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="cell-study-bible">Texto bíblico base</Label><Input id="cell-study-bible" value={biblicalText} onChange={(event) => setBiblicalText(event.target.value)} placeholder="Ex.: João 15:1–8" maxLength={500} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="cell-study-objective">Objetivo</Label><Textarea id="cell-study-objective" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="O que o grupo deve compreender e praticar?" /></div><div className="space-y-2"><Label htmlFor="cell-study-introduction">Introdução ou quebra-gelo</Label><Textarea id="cell-study-introduction" value={introduction} onChange={(event) => setIntroduction(event.target.value)} placeholder="Como iniciar a conversa?" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="cell-study-development">Desenvolvimento</Label><Textarea id="cell-study-development" className="min-h-32" value={development} onChange={(event) => setDevelopment(event.target.value)} placeholder="Conteúdo principal, versículos e orientação para o líder." /></div><div className="space-y-2"><Label htmlFor="cell-study-questions">Perguntas para discussão</Label><Textarea id="cell-study-questions" value={discussionQuestions} onChange={(event) => setDiscussionQuestions(event.target.value)} placeholder="Uma pergunta por linha." /></div><div className="space-y-2"><Label htmlFor="cell-study-application">Aplicação prática</Label><Textarea id="cell-study-application" value={practicalApplication} onChange={(event) => setPracticalApplication(event.target.value)} placeholder="Qual passo o grupo pode assumir nesta semana?" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="cell-study-prayer">Momento de oração</Label><Textarea id="cell-study-prayer" value={prayer} onChange={(event) => setPrayer(event.target.value)} placeholder="Direção para encerrar o encontro." /></div></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={clearForm}>Cancelar</Button><Button type="button" className="bg-[#1e3a5f] text-white" disabled={createStudy.isPending || updateStudy.isPending} onClick={save}>{createStudy.isPending || updateStudy.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingId ? "Salvar estudo" : "Criar rascunho"}</Button></div></CardContent></Card> : null}
    {canManage && access?.canAssignAdministrators ? <Card className="border-[#1e3a5f]/15"><CardHeader><CardTitle className="flex items-center gap-2 text-[#1e3a5f]"><ShieldCheck className="h-5 w-5 text-[#c9a84c]" />Responsáveis pelos estudos</CardTitle><p className="text-sm font-normal text-muted-foreground">O Pastor autoriza quem poderá criar, publicar e anexar materiais.</p></CardHeader><CardContent className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><select className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={administratorId} onChange={(event) => setAdministratorId(event.target.value)}><option value="">Selecione uma conta ativa</option>{(accounts ?? []).filter((account) => account.active && !(administrators as Array<{ churchUserId: number }>).some((item) => item.churchUserId === account.id)).map((account) => <option key={account.id} value={String(account.id)}>{account.name} · {account.email}</option>)}</select><Button type="button" disabled={!administratorId || assignAdministrator.isPending} onClick={() => assignAdministrator.mutate({ churchId, churchUserId: Number(administratorId) })}><ShieldCheck className="mr-2 h-4 w-4" />Autorizar</Button></div>{administrators.map((administrator) => <div key={administrator.churchUserId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#1e3a5f]">{administrator.name}</span><span className="block truncate text-xs text-muted-foreground">{administrator.email}</span></span><Button type="button" size="sm" variant="outline" onClick={() => removeAdministrator.mutate({ churchId, churchUserId: administrator.churchUserId })}>Remover</Button></div>)}</CardContent></Card> : null}
    <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 text-sm text-[#1e3a5f]"><strong>Como usar:</strong> abra o estudo publicado da semana, leia o roteiro no celular e baixe o PDF ou abra os materiais complementares quando precisar.</div>
    {isLoading ? <div className="space-y-3"><Card className="h-40 animate-pulse bg-muted/30" /><Card className="h-40 animate-pulse bg-muted/30" /></div> : rows.length ? <div className="space-y-4">{rows.map(({ study, attachments }) => <Card key={study.id} className={study.status === "arquivado" ? "opacity-70" : ""}><CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant={study.status === "publicado" ? "default" : "secondary"}>{STATUS_LABELS[study.status]}</Badge><span className="text-xs font-medium uppercase tracking-wide text-[#c9a84c]">Semana de {formatWeek(study.weekStart)}</span></div><CardTitle className="text-xl text-[#1e3a5f]">{study.title}</CardTitle>{study.biblicalText ? <p className="mt-1 text-sm font-medium text-muted-foreground">{study.biblicalText}</p> : null}</div>{canManage ? <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => beginEdit(study)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>{study.status !== "publicado" ? <Button type="button" size="sm" onClick={() => updateStudy.mutate({ id: study.id, churchId, status: "publicado" })}>Publicar</Button> : <Button type="button" size="sm" variant="outline" onClick={() => updateStudy.mutate({ id: study.id, churchId, status: "arquivado" })}>Arquivar</Button>}</div> : null}</div></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><section><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Objetivo</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.objective || "Não informado."}</p></section><section><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Introdução</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.introduction || "Não informado."}</p></section><section className="md:col-span-2"><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Desenvolvimento</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.development || "Não informado."}</p></section><section><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Perguntas</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.discussionQuestions || "Não informado."}</p></section><section><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Aplicação prática</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.practicalApplication || "Não informado."}</p></section><section className="md:col-span-2"><h3 className="mb-1 text-sm font-semibold text-[#1e3a5f]">Oração</h3><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{study.prayer || "Não informado."}</p></section></div><AttachmentList studyId={study.id} attachments={attachments} canManage={canManage} churchId={churchId} onChanged={invalidate} /></CardContent></Card>)}</div> : <Card className="border-dashed border-[#c9a84c]/30"><CardContent className="p-12 text-center"><BookOpen className="mx-auto mb-4 h-12 w-12 text-[#c9a84c]/40" /><h2 className="text-lg font-semibold text-[#1e3a5f]">Nenhum estudo publicado</h2><p className="mt-2 text-sm text-muted-foreground">{canManage ? "Crie o primeiro estudo da semana e publique quando estiver pronto." : "Os responsáveis ainda não publicaram um estudo para as Células."}</p></CardContent></Card>}
  </div>;
}

