import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/** Configuração do SMTP usado para recuperação de senha e confirmação de e-mail. Senha fica criptografada no banco; esta tela nunca a mostra de volta. */
export default function MailSettings() {
  const config = trpc.superAdmin.mailConfig.useQuery();
  const [form, setForm] = useState({
    host: "", port: 465, secure: true, user: "", fromAddress: "", password: "",
    enablePasswordReset: false, enableEmailVerification: false,
  });
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (!config.data) return;
    setForm(f => ({
      ...f,
      host: config.data.host, port: config.data.port, secure: config.data.secure,
      user: config.data.user, fromAddress: config.data.fromAddress,
      enablePasswordReset: config.data.enablePasswordReset, enableEmailVerification: config.data.enableEmailVerification,
    }));
  }, [config.data]);

  const save = trpc.superAdmin.saveMailConfig.useMutation({
    onSuccess: () => { toast.success("Configuração de e-mail salva."); setForm(f => ({ ...f, password: "" })); config.refetch(); },
    onError: error => toast.error(error.message),
  });
  const test = trpc.superAdmin.testMailConfig.useMutation({
    onSuccess: () => toast.success("E-mail de teste enviado. Confira a caixa de entrada (e o spam)."),
    onError: error => toast.error(error.message),
  });

  return (
    <Card className="bg-white/5 border-white/10 mt-6">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="font-semibold text-white">E-mail (SMTP) da plataforma</h2>
          <p className="text-sm text-white/50 mt-1">Usado para enviar o link de recuperação de senha e a confirmação de e-mail das igrejas. A senha fica criptografada no banco; depois de salva, não é mostrada de volta.</p>
        </div>
        {config.isLoading ? (
          <div className="flex items-center text-white/50 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
              <div>
                <Label className="text-white/70">Servidor SMTP</Label>
                <Input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" className="mt-1 bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Porta</Label>
                <Input type="number" value={form.port} onChange={e => setForm({ ...form, port: Number(e.target.value) })} className="mt-1 bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.secure} onCheckedChange={v => setForm({ ...form, secure: v })} />
              <Label className="text-white/70">Conexão segura (SSL/TLS)</Label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Usuário do SMTP</Label>
                <Input value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} placeholder="conta@gmail.com" className="mt-1 bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <Label className="text-white/70">E-mail remetente (From)</Label>
                <Input type="email" value={form.fromAddress} onChange={e => setForm({ ...form, fromAddress: e.target.value })} placeholder="noreply@idefazei.com.br" className="mt-1 bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-white/70">Senha (ou senha de app)</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={config.data?.passwordMasked ? `Atual: ${config.data.passwordMasked} — deixe em branco para manter` : "Digite a senha"} className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.enablePasswordReset} onCheckedChange={v => setForm({ ...form, enablePasswordReset: v })} /><Label className="text-white/70">Ativar e-mail de recuperação de senha</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.enableEmailVerification} onCheckedChange={v => setForm({ ...form, enableEmailVerification: v })} /><Label className="text-white/70">Ativar confirmação de e-mail no cadastro</Label></div>
            <Button disabled={save.isPending} onClick={() => save.mutate(form)} className="bg-[#c9a84c] text-[#0f1923] hover:bg-[#b8943e]">
              {save.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar configuração"}
            </Button>
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-white/70">Enviar e-mail de teste para</Label>
                <Input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="seu@email.com" className="mt-1 bg-white/10 border-white/20 text-white" />
              </div>
              <Button variant="outline" disabled={test.isPending || !testTo} onClick={() => test.mutate({ to: testTo })} className="border-white/20 text-white hover:bg-white/10">
                {test.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</> : "Testar envio"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
