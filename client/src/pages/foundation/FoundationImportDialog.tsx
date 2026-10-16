import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { uploadFoundationImportPreview, type FoundationImportPreview } from "@/lib/foundationImportUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function FoundationImportDialog({ courseId, courseName, onImported }: { courseId: number; courseName: string; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FoundationImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const confirmMutation = trpc.foundationImport.confirm.useMutation({
    onSuccess: () => {
      toast.success("Estudo importado. Revise a publicação na gestão da Escola.");
      onImported();
      reset();
      setOpen(false);
    },
    onError: (mutationError) => setError(mutationError.message),
  });
  const cancelMutation = trpc.foundationImport.cancel.useMutation({
    onSuccess: () => { reset(); setOpen(false); },
    onError: (mutationError) => setError(mutationError.message),
  });

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadFoundationImportPreview(file, courseId);
      setPreview(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível validar o gabarito.");
    } finally {
      setIsUploading(false);
    }
  }

  const problems = preview?.summary.problems ?? [];
  const hasErrors = Boolean(preview?.summary.errors);
  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" className="border-[#c9a84c] text-[#1e3a5f]"><FileSpreadsheet className="mr-2 h-4 w-4" />Importar gabarito Excel</Button>
    </DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="border-b bg-[#fdfaf1] px-5 py-4 sm:px-6"><DialogTitle className="flex items-center gap-2 text-[#1e3a5f]"><FileSpreadsheet className="h-5 w-5 text-[#c9a84c]" />Importar estudo para {courseName}</DialogTitle><DialogDescription>Envie o gabarito, revise os problemas e confirme somente quando a prévia estiver correta.</DialogDescription></DialogHeader>
      <div className="max-h-[calc(90vh-5rem)] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Badge variant={!preview ? "default" : "secondary"}>1. Enviar</Badge><span>→</span><Badge variant={preview ? "default" : "secondary"}>2. Revisar</Badge><span>→</span><Badge variant={preview && !hasErrors ? "default" : "secondary"}>3. Confirmar</Badge></div>
        {error ? <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
        {!preview ? <div className="space-y-4">
          <div className="rounded-xl border border-[#c9a84c]/25 bg-[#fdfaf1] p-4"><p className="font-semibold text-[#1e3a5f]">Preencha o modelo oficial</p><p className="mt-1 text-sm text-muted-foreground">Use as abas ESTUDO, BLOCOS, PERGUNTAS, AULA e MATERIAIS. O upload não cria conteúdo ainda; ele somente prepara uma prévia.</p><a href="/gabarito-fundamentos-template.xlsx" download className="mt-3 inline-flex items-center text-sm font-semibold text-[#1e3a5f] hover:text-[#c9a84c]"><Download className="mr-2 h-4 w-4" />Baixar modelo Excel</a></div>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#1e3a5f]/20 bg-white px-4 text-center hover:border-[#c9a84c]" htmlFor="foundation-import-file"><Upload className="mb-2 h-6 w-6 text-[#c9a84c]" /><span className="text-sm font-semibold text-[#1e3a5f]">Escolher arquivo .xlsx</span><span className="mt-1 text-xs text-muted-foreground">Máximo de 2 MB, sem macros</span><input ref={inputRef} id="foundation-import-file" className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} /></label>
          {file ? <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm"><span className="min-w-0 truncate font-medium text-[#1e3a5f]">{file.name}</span><span className="shrink-0 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span></div> : null}
          <Button type="button" className="w-full bg-[#1e3a5f] text-white" disabled={!file || isUploading} onClick={handleUpload}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{isUploading ? "Validando…" : "Validar e gerar prévia"}</Button>
        </div> : <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Blocos</p><p className="text-xl font-semibold text-[#1e3a5f]">{preview.summary.counts.blocks}</p></div><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Perguntas</p><p className="text-xl font-semibold text-[#1e3a5f]">{preview.summary.counts.questions}</p></div><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Materiais</p><p className="text-xl font-semibold text-[#1e3a5f]">{preview.summary.counts.materials}</p></div><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Aula</p><p className="text-xl font-semibold text-[#1e3a5f]">{preview.summary.classIncluded ? "Sim" : "Não"}</p></div></div>
          <div className="rounded-xl border border-[#1e3a5f]/15 bg-white p-4"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><p className="font-semibold text-[#1e3a5f]">{preview.payload.study.title || "Estudo sem título"}</p><p className="mt-1 text-sm text-muted-foreground">Semana de {preview.payload.study.weekStart || "data não informada"} · {preview.summary.publishStudy ? "será publicado" : "será importado como rascunho"}</p><p className="mt-2 text-sm text-muted-foreground">A confirmação criará somente o estudo e seus conteúdos. Nenhuma presença ou progresso será alterado.</p></div></div></div>
          {problems.length ? <div className="space-y-2"><p className="font-semibold text-[#1e3a5f]">Problemas encontrados</p>{problems.map((problem, index) => <div key={`${problem.code}-${problem.row}-${problem.field}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${problem.severity === "erro" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><p className="font-semibold">{problem.sheet}{problem.row ? `!${problem.row}` : ""}{problem.field ? ` · ${problem.field}` : ""} · {problem.code}</p><p className="mt-1">{problem.message}</p></div>)}</div> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Nenhum erro encontrado. A prévia está pronta para confirmação.</div>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button type="button" variant="outline" disabled={confirmMutation.isPending || cancelMutation.isPending} onClick={() => { if (preview) cancelMutation.mutate({ draftId: preview.draftId }); }}>Descartar prévia</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={() => { setPreview(null); setError(null); }}>Escolher outro arquivo</Button><Button type="button" className="bg-[#1e3a5f] text-white" disabled={hasErrors || confirmMutation.isPending} onClick={() => { if (preview) confirmMutation.mutate({ draftId: preview.draftId }); }}>{confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Confirmar importação</Button></div></div>
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
