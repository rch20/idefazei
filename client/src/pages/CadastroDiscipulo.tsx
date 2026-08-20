import { useState } from "react";
import { Link } from "wouter";
import { Church, CheckCircle2, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useChurchSlug } from "@/hooks/useTenant";

export default function CadastroDiscipulo() {
  const slug = useChurchSlug();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", whatsapp: "" });
  const [sent, setSent] = useState(false);
  const register = trpc.register.disciple.useMutation({ onSuccess: () => setSent(true) });

  if (!slug) return <div className="min-h-screen grid place-items-center bg-[#f5f0e8] p-6 text-center"><div><Church className="mx-auto mb-3 text-[#c9a84c]" size={38}/><h1 className="font-serif text-2xl text-[#1e3a5f]">Cadastro disponível no link da sua igreja</h1><p className="mt-2 text-slate-600">Acesse o subdomínio informado pela liderança para entrar na comunidade.</p></div></div>;
  if (sent) return <div className="min-h-screen grid place-items-center bg-[#f5f0e8] p-6 text-center"><div className="max-w-md rounded-2xl bg-white p-8 shadow"><CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={48}/><h1 className="font-serif text-3xl text-[#1e3a5f]">Cadastro recebido</h1><p className="mt-3 text-slate-600">A liderança da igreja analisará seu cadastro. Você receberá acesso após a aprovação.</p><Link href="/login" className="mt-6 inline-block text-[#1e3a5f] underline">Voltar ao login</Link></div></div>;

  const submit = (event: React.FormEvent) => { event.preventDefault(); register.mutate({ churchSlug: slug, ...form }); };
  return <main className="min-h-screen bg-[#f5f0e8] px-4 py-10"><section className="mx-auto max-w-lg rounded-2xl border border-[#c9a84c]/30 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-[#1e3a5f] p-3 text-[#c9a84c]"><UserPlus size={23}/></div><div><p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Ide Fazei</p><h1 className="font-serif text-3xl text-[#1e3a5f]">Cadastre-se na igreja</h1></div></div><p className="mb-6 text-sm text-slate-600">Preencha seus dados para que a liderança confirme seu ingresso.</p><form onSubmit={submit} className="space-y-4">{[["name","Nome completo","text"],["email","E-mail","email"],["phone","Telefone","tel"],["whatsapp","WhatsApp","tel"],["password","Crie uma senha","password"]].map(([key,label,type])=><label key={key} className="block text-sm font-medium text-slate-700">{label}<input required={key !== "phone"} type={type} value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#c9a84c]"/></label>)}{register.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{register.error.message}</p>}<button disabled={register.isPending} className="w-full rounded-lg bg-[#1e3a5f] py-3 font-semibold text-white disabled:opacity-60">{register.isPending ? "Enviando..." : "Enviar cadastro"}</button></form><p className="mt-5 text-center text-sm text-slate-600">Já possui acesso? <Link href="/login" className="font-semibold text-[#1e3a5f] underline">Entrar</Link></p></section></main>;
}
