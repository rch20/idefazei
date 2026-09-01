import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Printer, Send, Share2 } from "lucide-react";

type TreasuryPdfPreviewProps = {
  open: boolean;
  blob: Blob | null;
  fileName: string;
  title: string;
  whatsappText?: string;
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

export async function shareTreasuryPdf(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: "application/pdf", lastModified: Date.now() });
  const shareData: ShareData = { title, text: `${title} da igreja em PDF.`, files: [file] };
  if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) return false;
  await navigator.share(shareData);
  return true;
}

export function TreasuryPdfPreview({ open, blob, fileName, title, whatsappText, onClose }: TreasuryPdfPreviewProps) {
  const [sharing, setSharing] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const url = useMemo(() => blob ? URL.createObjectURL(blob) : "", [blob]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const handleShare = async () => {
    if (!blob) return;
    setSharing(true);
    try {
      const shared = await shareTreasuryPdf(blob, fileName, title);
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

  const handleWhatsApp = () => {
    if (!whatsappText) return toast.error("Não há uma mensagem preparada para este relatório.");
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) toast.error("Permita novas abas para abrir o WhatsApp.");
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
      <DialogContent showCloseButton={false} className="!flex h-[100dvh] w-screen min-w-0 max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[96vh] sm:w-[96vw] sm:max-w-6xl sm:rounded-2xl sm:border">
        <header className="min-w-0 shrink-0 overflow-hidden border-b border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex sm:items-center sm:gap-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-navy"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
            <div className="min-w-0 flex-1 sm:flex-none"><p className="truncate text-sm font-semibold text-navy">{title}</p><p className="truncate text-[11px] text-muted-foreground">Prévia do arquivo PDF</p></div>
          </div>
          <div className="mt-2 grid min-w-0 grid-cols-4 gap-2 sm:ml-auto sm:mt-0 sm:flex">
            <Button variant="outline" size="sm" aria-label="Compartilhar" title="Compartilhar pelo celular" onClick={() => void handleShare()} disabled={!blob || sharing} className="min-w-0 gap-1.5 px-2 sm:px-3">{sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}<span className="sr-only sm:not-sr-only">Compartilhar</span></Button>
            <Button variant="outline" size="sm" aria-label="WhatsApp" onClick={handleWhatsApp} disabled={!whatsappText} className="min-w-0 gap-1.5 px-2 sm:px-3"><Send className="h-4 w-4" /><span className="sr-only sm:not-sr-only">WhatsApp</span></Button>
            <Button variant="outline" size="sm" aria-label="Baixar" title="Baixar PDF" onClick={() => blob && downloadTreasuryPdf(blob, fileName)} disabled={!blob} className="min-w-0 gap-1.5 px-2 sm:px-3"><Download className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Baixar</span></Button>
            <Button variant="outline" size="sm" aria-label="Imprimir" title="Imprimir ou salvar PDF" onClick={handlePrint} disabled={!blob} className="min-w-0 gap-1.5 px-2 sm:px-3"><Printer className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Imprimir</span></Button>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-100 p-1.5 sm:p-3">
          {url ? <iframe ref={printFrameRef} title="Prévia do relatório de Tesouraria em PDF" src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="h-full w-full rounded-lg border border-slate-300 bg-white shadow-sm" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando relatório…</div>}
        </main>
      </DialogContent>
    </Dialog>
  );
}
