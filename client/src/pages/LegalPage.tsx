import type { ReactNode } from "react";
import { Link } from "wouter";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { formatCnpj } from "@shared/platformContact";

export type LegalSection = { title: string; body: ReactNode };

/** Layout comum das páginas legais públicas (Termos de uso e Política de privacidade). */
export function LegalPage({ title, intro, updatedAt, sections }: { title: string; intro: string; updatedAt: string; sections: LegalSection[] }) {
  const { contact } = usePlatformContact();
  const contactEmail = contact.email || "contato@idefazei.com.br";
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <header className="border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-serif text-lg font-bold text-[#1e3a5f]">Ide Fazei</Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#1e3a5f]/70 hover:text-[#1e3a5f]">
            <span aria-hidden="true">←</span> Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-bold text-[#1e3a5f] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#1e3a5f]/60">Última atualização: {updatedAt}</p>
        <p className="mt-6 text-base leading-7 text-slate-700">{intro}</p>
        <nav aria-label="Seções" className="mt-6 rounded-xl border border-[#1e3a5f]/10 bg-white p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-[#1e3a5f]">
            {sections.map((section, index) => (
              <li key={section.title}><a href={`#secao-${index + 1}`} className="hover:underline">{section.title}</a></li>
            ))}
          </ol>
        </nav>
        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section key={section.title} id={`secao-${index + 1}`} className="scroll-mt-6">
              <h2 className="font-serif text-xl font-semibold text-[#1e3a5f]">{index + 1}. {section.title}</h2>
              <div className="mt-2 space-y-3 text-base leading-7 text-slate-700 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">{section.body}</div>
            </section>
          ))}
        </div>
        <footer className="mt-12 border-t border-[#1e3a5f]/10 pt-6 text-sm text-slate-600">
          <p>{contact.legalName || "Ide Fazei"}{contact.cnpj ? ` · CNPJ ${formatCnpj(contact.cnpj)}` : ""}</p>
          <p className="mt-1">Dúvidas: <a className="text-[#1e3a5f] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
          <p className="mt-3 flex gap-4">
            <Link href="/termos" className="underline">Termos de uso</Link>
            <Link href="/privacidade" className="underline">Política de privacidade</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
