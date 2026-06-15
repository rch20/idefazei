import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contato() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", church: "", message: "" });

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message || "Erro ao enviar. Tente novamente."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="80%" cy="20%" r="350" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="20%" cy="80%" r="280" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <span className="text-[#c9a84c] text-sm font-bold">✦</span>
              </div>
              <div>
                <div className="font-serif font-bold text-[#1e3a5f] text-lg leading-none">Lampas</div>
                <div className="text-[10px] tracking-[0.2em] text-[#c9a84c] uppercase">Plataforma Ministerial</div>
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[#1e3a5f]/60 hover:text-[#1e3a5f]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 mb-6">
            <span className="text-[#c9a84c] text-xs tracking-widest uppercase font-medium">Fale Conosco</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
            Estamos aqui para ajudar
          </h1>
          <p className="font-serif italic text-[#1e3a5f]/60 text-lg">
            Nossa equipe responde em até 24 horas úteis
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#1e3a5f] mb-6">Informações de contato</h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "Email", value: "contato@lampas.com.br" },
                  { icon: Phone, label: "WhatsApp", value: "(11) 99999-9999" },
                  { icon: MapPin, label: "Localização", value: "São Paulo, SP — Brasil" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#1e3a5f]/40 uppercase tracking-wider">{label}</div>
                      <div className="text-[#1e3a5f] font-medium">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#1e3a5f]/10">
              <h3 className="font-serif font-bold text-[#1e3a5f] mb-3">Horário de atendimento</h3>
              <div className="space-y-2 text-sm text-[#1e3a5f]/60">
                <div className="flex justify-between">
                  <span>Segunda a Sexta</span>
                  <span className="font-medium text-[#1e3a5f]">8h às 18h</span>
                </div>
                <div className="flex justify-between">
                  <span>Sábado</span>
                  <span className="font-medium text-[#1e3a5f]">9h às 13h</span>
                </div>
                <div className="flex justify-between">
                  <span>Domingo</span>
                  <span className="text-[#1e3a5f]/30">Fechado</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white">
              <h3 className="font-serif font-bold text-lg mb-2">Pronto para começar?</h3>
              <p className="text-white/70 text-sm mb-4">Cadastre sua igreja gratuitamente e experimente por 14 dias sem compromisso.</p>
              <Link href="/cadastro-igreja">
                <Button className="bg-[#c9a84c] hover:bg-[#b8943d] text-white w-full">
                  Cadastrar minha igreja
                </Button>
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl p-8 border border-[#1e3a5f]/10 shadow-sm">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#1e3a5f] mb-2">Mensagem enviada!</h3>
                <p className="text-[#1e3a5f]/60 mb-6">Retornaremos em até 24 horas úteis.</p>
                <Button
                  variant="outline"
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", church: "", message: "" }); }}
                  className="border-[#1e3a5f]/20 text-[#1e3a5f]"
                >
                  Enviar outra mensagem
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="font-serif text-xl font-bold text-[#1e3a5f] mb-6">Envie sua mensagem</h2>
                <div>
                  <Label className="text-[#1e3a5f]/70 text-sm mb-1.5 block">Nome completo *</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Seu nome"
                    className="border-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <Label className="text-[#1e3a5f]/70 text-sm mb-1.5 block">Email *</Label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="border-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <Label className="text-[#1e3a5f]/70 text-sm mb-1.5 block">Nome da Igreja</Label>
                  <Input
                    value={form.church}
                    onChange={e => setForm(f => ({ ...f, church: e.target.value }))}
                    placeholder="Ex: Igreja Viver"
                    className="border-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <Label className="text-[#1e3a5f]/70 text-sm mb-1.5 block">Mensagem *</Label>
                  <Textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Como podemos ajudar sua igreja?"
                    rows={5}
                    className="border-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
                  />
                </div>
                <Button type="submit" disabled={sendMutation.isPending} className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {sendMutation.isPending ? "Enviando..." : "Enviar mensagem"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
