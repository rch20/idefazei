import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { useParams } from "wouter";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { trpc } from "@/lib/trpc";

function Paragraphs({ text, className }: { text: string; className?: string }) {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className={className}>
      {parts.map((part, index) => (
        <p key={index} className="whitespace-pre-line leading-7 text-slate-700 [&:not(:first-child)]:mt-4">
          {part}
        </p>
      ))}
    </div>
  );
}

export default function EstudoPublico() {
  const { studyId: studyIdParam = "" } = useParams<{ studyId: string }>();
  const studyId = Number(studyIdParam);
  const query = trpc.tenantPublic.study.useQuery(
    { studyId },
    { enabled: Number.isFinite(studyId) && studyId > 0, retry: false },
  );

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1e3a5f]" />
          <p className="mt-3 text-sm text-slate-600">Carregando o estudo...</p>
        </div>
      </div>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-6">
        <div className="max-w-md text-center">
          <BookOpen className="mx-auto h-10 w-10 text-[#1e3a5f]/40" />
          <h1 className="mt-4 font-display text-xl font-bold text-[#1e3a5f]">Estudo indisponível</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Este estudo não está disponível publicamente. Peça o link atualizado à sua igreja ou acesse pela sua conta.
          </p>
        </div>
      </div>
    );
  }

  const brand = { primaryColor: data.church.primaryColor, secondaryColor: data.church.secondaryColor };

  return (
    <TenantPublicShell brand={brand}>
      <main className="min-h-screen bg-[#f7f4ed] pb-16">
        <header
          className="px-6 py-10 text-white"
          style={{ background: `linear-gradient(135deg, ${data.church.primaryColor}, ${data.church.primaryColor}dd)` }}
        >
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{data.church.name}</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight">{data.study.title}</h1>
            {data.study.summary && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{data.study.summary}</p>}
          </div>
        </header>

        <div className="mx-auto mt-8 max-w-3xl space-y-6 px-6">
          {data.study.content?.trim() && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Paragraphs text={data.study.content} />
            </section>
          )}

          {data.blocks.map((block, index) => (
            <section key={block.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: data.church.primaryColor }}
                >
                  {index + 1}
                </span>
                <h2 className="font-display text-lg font-bold text-[#1e3a5f]">{block.title}</h2>
              </div>
              <Paragraphs text={block.content} className="mt-3" />
              {block.reflectionPrompt?.trim() && (
                <div
                  className="mt-4 rounded-xl p-4"
                  style={{ backgroundColor: `${data.church.secondaryColor}14` }}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: data.church.secondaryColor }}>
                    <Sparkles className="h-3.5 w-3.5" /> Para refletir
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">{block.reflectionPrompt}</p>
                </div>
              )}
            </section>
          ))}

          <p className="pt-2 text-center text-xs text-slate-500">
            Leitura aberta para preparação. Para registrar seu progresso, acesse pela sua conta na igreja.
          </p>
        </div>
      </main>
    </TenantPublicShell>
  );
}
