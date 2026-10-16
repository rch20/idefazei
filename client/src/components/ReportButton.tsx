import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportButtonProps {
  label?: string;
  onFetch: () => Promise<{ base64: string; filename: string } | null | undefined>;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Botão de exportação de relatório.
 * Chama onFetch() para obter o HTML em base64 e faz o download automático.
 */
export function ReportButton({
  label = "Baixar relatório",
  onFetch,
  variant = "outline",
  size = "sm",
  className = "",
}: ReportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const result = await onFetch();
      if (!result) {
        toast.error("Não foi possível gerar o relatório.");
        return;
      }
      // Decode base64 → Blob → download
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório baixado. Abra o arquivo e use a opção de imprimir ou salvar em PDF.");
    } catch {
      toast.error("Erro ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className={`border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4 mr-2" />
      )}
      {loading ? "Gerando..." : label}
    </Button>
  );
}
