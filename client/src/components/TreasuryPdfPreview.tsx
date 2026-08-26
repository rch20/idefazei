import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Printer, Share2 } from "lucide-react";

type TreasuryPdfPreviewProps = {
  open: boolean;
  blob: Blob | null;
  fileName: string;
  onClose: () => void;
};

export function downloadTreasuryPdf(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareTreasuryPdf(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: "application/pdf", lastModified: Date.now() });
  const shareData: ShareData = { title: "Relatório de Tesouraria", text: "Relatório financeiro da igreja em PDF.", files: [file] };
  if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) return false;
  await navigator.share(shareData);
  return true;
}

export function TreasuryPdfPreview({ open, blob, fileName, onClose }: TreasuryPdfPreviewProps) {
  const [sharing, setSharing] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const url = useMemo(() => blob ? URL.createObjectURL(blob) : "", [blob]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const handleShare = async () => {
    if (!blob) return;
    setSharing(true);
    try {
      const shared = await shareTreasuryPdf(blob, fileName);
      if (!shared) {
        downloadTreasuryPdf(blob, fileName);
        toast.info("O compartilhamento de arquivo não está disponível neste navegador. O PDF foi baixado para você enviar manualmente.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      downloadTreasuryPdf(blob, fileName);
      toast.error("Não foi possível abrir o compartilhamento. O PDF foi baixado como alternativa.");
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    const frame = printFrameRef.current;
    if (!frame?.contentWindow) return toast.error("Não foi possível preparar a impressão neste navegador.");
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      if (blob) downloadTreasuryPdf(blob, fileName);
      toast.info("A impressão direta não está disponível. O PDF foi baixado para impressão pelo dispositivo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent showCloseButton={false} className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:h-[96vh] sm:w-[96vw] sm:max-w-6xl sm:rounded-2xl sm:border">
        <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex sm:items-center sm:gap-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-navy"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            <div className="min-w-0 flex-1 sm:flex-none"><p className="truncate text-sm font-semibold text-navy">Relatório de Tesouraria</p><p className="truncate text-[11px] text-muted-foreground">Prévia do arquivo PDF</p></div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:ml-auto sm:mt-0 sm:flex">
            <Button variant="outline" size="sm" onClick={() => void handleShare()} disabled={!blob || sharing} className="gap-1.5 px-2 sm:px-3">{sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar</Button>
            <Button variant="outline" size="sm" onClick={() => blob && downloadTreasuryPdf(blob, fileName)} disabled={!blob} className="gap-1.5 px-2 sm:px-3"><Download className="h-4 w-4" /> Baixar</Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!blob} className="gap-1.5 px-2 sm:px-3"><Printer className="h-4 w-4" /> Imprimir</Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 bg-slate-100 p-1.5 sm:p-3">
          {url ? <iframe ref={printFrameRef} title="Prévia do relatório de Tesouraria em PDF" src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="h-full w-full rounded-lg border border-slate-300 bg-white shadow-sm" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando relatório…</div>}
        </main>
      </DialogContent>
    </Dialog>
  );
}
