// Portão de 2FA (TOTP) da Tesouraria. (2026-11)
//
// Protege a área de tesouraria no cliente: primeira vez pede o cadastro do app autenticador;
// depois pede o código uma vez por sessão. A autoridade real é do servidor
// (requireTreasuryAccess) — esta tela é a conveniência que guia o usuário.
import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, KeyRound, Copy, Download, Check, Loader2, RefreshCw } from "lucide-react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── PDF mínimo (texto) para os códigos de recuperação — sem dependência extra ──
function buildRecoveryPdf(title: string, lines: string[]): Blob {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content: string[] = ["BT", "/F1 16 Tf", "72 770 Td", `(${esc(title)}) Tj`, "/F1 11 Tf"];
  let y = 736;
  for (const ln of lines) {
    content.push(`1 0 0 1 72 ${y} Tm`, `(${esc(ln)}) Tj`);
    y -= 20;
  }
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function GateShell({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-lg items-center justify-center p-4">
      <Card className="w-full border-gold/25 shadow-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-navy/5 text-navy">{icon}</div>
          <CardTitle className="font-display text-xl text-navy">{title}</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

function CodeField({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "000000",
  maxLength = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Input
      value={value}
      inputMode={maxLength <= 6 ? "numeric" : "text"}
      autoComplete="one-time-code"
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
      }}
      className="text-center text-lg tracking-[0.4em]"
    />
  );
}

// ─── Cadastro (primeira vez) ─────────────────────────────────────────────────
function EnrollFlow({ churchId, churchName, onDone }: { churchId: number; churchName: string; onDone: () => void }) {
  const [step, setStep] = useState<"intro" | "scan" | "codes">("intro");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const begin = trpc.treasury.twoFactorBeginEnroll.useMutation({
    onSuccess: (data) => {
      setOtpauthUri(data.otpauthUri);
      setManualKey(data.manualKey);
      setStep("scan");
    },
    onError: (e) => toast.error(e.message),
  });

  const confirm = trpc.treasury.twoFactorConfirmEnroll.useMutation({
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setStep("codes");
    },
    onError: (e) => toast.error(e.message),
  });

  if (step === "intro") {
    return (
      <GateShell
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Proteja a Tesouraria"
        subtitle="A tesouraria mexe com dinheiro, então pedimos uma verificação em duas etapas. Você vai usar um app autenticador (Google Authenticator, Authy, Microsoft Authenticator…)."
      >
        <ul className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="font-semibold text-navy">1.</span> Instale um app autenticador no seu celular.</li>
          <li className="flex gap-2"><span className="font-semibold text-navy">2.</span> Escaneie o QR Code que vamos mostrar.</li>
          <li className="flex gap-2"><span className="font-semibold text-navy">3.</span> Digite o código de 6 dígitos para confirmar.</li>
        </ul>
        <Button className="w-full bg-navy text-white hover:bg-navy-light" disabled={begin.isPending} onClick={() => begin.mutate({ churchId })}>
          {begin.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
          Começar configuração
        </Button>
      </GateShell>
    );
  }

  if (step === "scan") {
    return (
      <GateShell
        icon={<Smartphone className="h-6 w-6" />}
        title="Escaneie no seu app"
        subtitle="Abra o app autenticador, toque em adicionar (+) e escaneie o QR Code abaixo."
      >
        <div className="flex justify-center">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <QRCodeSVG value={otpauthUri} size={188} level="M" includeMargin title="QR Code do 2FA" />
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">Não consegue escanear? Digite esta chave no app:</p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-navy">{manualKey}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totp-confirm">Código de 6 dígitos do app</Label>
          <CodeField value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} disabled={confirm.isPending} onSubmit={() => confirm.mutate({ churchId, code })} />
        </div>
        <Button
          className="w-full bg-navy text-white hover:bg-navy-light"
          disabled={confirm.isPending || code.length < 6}
          onClick={() => confirm.mutate({ churchId, code })}
        >
          {confirm.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Confirmar e ativar
        </Button>
      </GateShell>
    );
  }

  // step === "codes"
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success("Códigos copiados.");
    } catch {
      toast.error("Não foi possível copiar. Baixe o PDF.");
    }
  };
  const downloadPdf = () => {
    const title = `Códigos de recuperação — Tesouraria ${churchName}`.slice(0, 90);
    const lines = [
      "Guarde em local seguro. Cada código funciona uma única vez.",
      "Use um deles se perder o acesso ao app autenticador.",
      "",
      ...recoveryCodes,
    ];
    downloadBlob(buildRecoveryPdf(title, lines), "codigos-recuperacao-tesouraria.pdf");
  };

  return (
    <GateShell
      icon={<KeyRound className="h-6 w-6" />}
      title="Guarde seus códigos de recuperação"
      subtitle="Se um dia você perder o celular, um destes códigos destrava seu acesso. Cada um funciona uma só vez. Eles aparecem agora uma única vez."
    >
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-4 font-mono text-sm text-navy">
        {recoveryCodes.map((c) => (
          <div key={c} className="rounded bg-white px-2 py-1 text-center shadow-sm">{c}</div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyAll}><Copy className="h-4 w-4" />Copiar</Button>
        <Button type="button" variant="outline" className="flex-1 gap-2" onClick={downloadPdf}><Download className="h-4 w-4" />Baixar PDF</Button>
      </div>
      <label className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
        <input type="checkbox" checked={savedConfirmed} onChange={(e) => setSavedConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
        <span>Já guardei meus códigos de recuperação em um lugar seguro.</span>
      </label>
      <Button className="w-full bg-navy text-white hover:bg-navy-light" disabled={!savedConfirmed} onClick={onDone}>
        <Check className="mr-2 h-4 w-4" />Concluir e entrar na Tesouraria
      </Button>
    </GateShell>
  );
}

// ─── Verificação por sessão ──────────────────────────────────────────────────
function VerifyFlow({ churchId, lockedUntil, onDone }: { churchId: number; lockedUntil: string | null; onDone: () => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const locked = lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;

  const verify = trpc.treasury.twoFactorVerify.useMutation({
    onSuccess: (data) => {
      if (data.viaRecovery) {
        toast.success(`Acesso liberado. Restam ${data.remainingRecovery} códigos de recuperação.`);
      }
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (useRecovery) verify.mutate({ churchId, recoveryCode: code });
    else verify.mutate({ churchId, code });
  };

  return (
    <GateShell
      icon={<ShieldCheck className="h-6 w-6" />}
      title="Confirme sua identidade"
      subtitle={useRecovery ? "Digite um dos seus códigos de recuperação." : "Abra seu app autenticador e digite o código de 6 dígitos da Tesouraria."}
    >
      {locked && (
        <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="totp-verify">{useRecovery ? "Código de recuperação" : "Código do app"}</Label>
        <CodeField
          value={code}
          onChange={(v) => setCode(useRecovery ? v.toUpperCase() : v.replace(/\D/g, ""))}
          onSubmit={submit}
          disabled={verify.isPending || locked}
          placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
          maxLength={useRecovery ? 20 : 6}
        />
      </div>
      <Button
        className="w-full bg-navy text-white hover:bg-navy-light"
        disabled={verify.isPending || locked || code.length < (useRecovery ? 8 : 6)}
        onClick={submit}
      >
        {verify.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Entrar
      </Button>
      <button
        type="button"
        className="mx-auto block text-xs text-muted-foreground underline underline-offset-2 hover:text-navy"
        onClick={() => {
          setUseRecovery((v) => !v);
          setCode("");
        }}
      >
        {useRecovery ? "Usar o código do app autenticador" : "Perdi o acesso ao app — usar código de recuperação"}
      </button>
    </GateShell>
  );
}

export default function TreasuryTwoFactorGate({ children }: { children: ReactNode }) {
  const { churchId, churchName } = useChurch();
  const statusQuery = trpc.treasury.twoFactorStatus.useQuery(
    { churchId: churchId ?? 0 },
    { enabled: Boolean(churchId), staleTime: 60_000 },
  );
  const utils = trpc.useUtils();
  const refetch = () => {
    void utils.treasury.twoFactorStatus.invalidate();
  };

  if (!churchId) return null;
  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando segurança da Tesouraria…
      </div>
    );
  }
  if (statusQuery.isError || !statusQuery.data) {
    return (
      <GateShell icon={<RefreshCw className="h-6 w-6" />} title="Não foi possível verificar o 2FA" subtitle="Tente recarregar a página. Se continuar, fale com o suporte.">
        <Button className="w-full" variant="outline" onClick={() => void statusQuery.refetch()}>Tentar de novo</Button>
      </GateShell>
    );
  }
  const data = statusQuery.data;
  if (!data.enrolled) return <EnrollFlow churchId={churchId} churchName={churchName ?? ""} onDone={refetch} />;
  if (!data.sessionVerified) return <VerifyFlow churchId={churchId} lockedUntil={data.lockedUntil} onDone={refetch} />;
  return <>{children}</>;
}
