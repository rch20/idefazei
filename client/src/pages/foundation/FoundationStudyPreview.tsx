import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  MessageSquareText,
  Save,
  Sparkles,
} from "lucide-react";

const PREVIEW_STORAGE_KEY = "idefazei-foundation-study-preview-v1";

const DEMO_THEME = {
  primary: "#1f5a43",
  secondary: "#c49b4a",
  surface: "#f7f4ec",
  ink: "#18352a",
};

type PreviewStep = {
  key: string;
  label: string;
  shortLabel: string;
  title: string;
  eyebrow: string;
  reference?: string;
  body?: string;
  paragraphs?: string[];
  question?: boolean;
  options?: string[];
  correctOption?: string;
  explanation?: string;
};

const steps: PreviewStep[] = [
  {
    key: "leia",
    label: "Leia",
    shortLabel: "Leia e reflita",
    title: "Leia e reflita",
    eyebrow: "Etapa 1 de 4",
    reference: "Efésios 4:29",
    body: "Nenhuma palavra torpe saia da vossa boca, mas só a que for boa para edificação, conforme a necessidade, a fim de que ministre graça aos que ouvem.",
    paragraphs: [
      "Nossas palavras têm poder. Elas podem construir ou destruir, aproximar ou afastar.",
      "Antes de continuar, leia com calma e perceba como esse ensinamento conversa com sua semana.",
    ],
  },
  {
    key: "entenda",
    label: "Entenda",
    shortLabel: "Aprofunde o significado",
    title: "Entenda a mensagem",
    eyebrow: "Etapa 2 de 4",
    reference: "Uma palavra pode abrir espaço para a graça",
    body: "Falar com cuidado não é esconder o que pensamos. É escolher um jeito que preserve a verdade e também cuide de quem escuta.",
    paragraphs: [
      "Quando ouvimos antes de responder, percebemos melhor a necessidade do outro e diminuímos as respostas feitas no impulso.",
    ],
  },
  {
    key: "responda",
    label: "Responda",
    shortLabel: "Pense e escolha sua resposta",
    title: "Qual atitude ajuda a construir relacionamentos?",
    eyebrow: "Etapa 3 de 4",
    question: true,
    options: [
      "Ouvir antes de responder",
      "Responder com irritação",
      "Ignorar o que o outro sente",
    ],
    correctOption: "Ouvir antes de responder",
    explanation: "Ouvir com atenção ajuda a responder com cuidado e respeito.",
  },
  {
    key: "aplique",
    label: "Aplique",
    shortLabel: "Leve para sua vida",
    title: "Leve uma decisão para a sua semana",
    eyebrow: "Etapa 4 de 4",
    body: "Escolha uma conversa em que você deseja praticar escuta, calma e palavras que edifiquem.",
    paragraphs: [
      "Sua anotação fica salva nesta prévia para você fechar e continuar depois no mesmo navegador.",
    ],
  },
];

type PreviewState = {
  step: number;
  answer: string;
  note: string;
  completed: number[];
};

const initialState: PreviewState = { step: 0, answer: "", note: "", completed: [] };

function readPreviewState(): PreviewState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<PreviewState>;
    return {
      step: typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), steps.length - 1) : 0,
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((value): value is number => typeof value === "number") : [],
    };
  } catch {
    return initialState;
  }
}

function StepCircle({ index, active, complete }: { index: number; active: boolean; complete: boolean }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors"
      style={active || complete
        ? { backgroundColor: DEMO_THEME.primary, borderColor: DEMO_THEME.primary, color: "#fff" }
        : { backgroundColor: "#fff", borderColor: "#d7d8d0", color: "#657168" }}
    >
      {complete ? <Check className="h-4 w-4" /> : index + 1}
    </span>
  );
}

export default function FoundationStudyPreview() {
  const [state, setState] = useState<PreviewState>(readPreviewState);
  const [saved, setSaved] = useState(true);
  const step = steps[state.step];
  const progress = Math.round(((state.completed.length + (state.completed.includes(state.step) ? 0 : 0)) / steps.length) * 100);
  const isLast = state.step === steps.length - 1;
  const canContinue = !step.question || state.answer.length > 0;
  const themeStyle = {
    "--foundation-primary": DEMO_THEME.primary,
    "--foundation-secondary": DEMO_THEME.secondary,
    "--foundation-surface": DEMO_THEME.surface,
    "--foundation-ink": DEMO_THEME.ink,
  } as CSSProperties;

  useEffect(() => {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
  }, [state]);

  const completedSet = useMemo(() => new Set(state.completed), [state.completed]);

  const updateNote = (note: string) => {
    setSaved(false);
    setState((current) => ({ ...current, note }));
  };

  const continueStep = () => {
    if (!canContinue) return;
    setState((current) => {
      const completed = current.completed.includes(current.step) ? current.completed : [...current.completed, current.step];
      return { ...current, completed, step: Math.min(current.step + 1, steps.length - 1) };
    });
  };

  const goBack = () => setState((current) => ({ ...current, step: Math.max(0, current.step - 1) }));
  const restart = () => setState(initialState);

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-slate-800" style={themeStyle}>
      <header className="border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: DEMO_THEME.primary }}>
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold" style={{ color: DEMO_THEME.primary }}>Escola de Fundamentos</p>
              <p className="text-xs text-slate-500">Prévia visual · estudo de exemplo</p>
            </div>
          </div>
          <span className="hidden rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex" style={{ borderColor: `${DEMO_THEME.secondary}66`, color: DEMO_THEME.primary }}>
            Paleta demonstrativa
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        <section className="mb-5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-10" style={{ backgroundColor: DEMO_THEME.secondary }} />
            <div className="relative max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: DEMO_THEME.secondary }}><Sparkles className="h-4 w-4" />Estudo da semana</p>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl" style={{ color: DEMO_THEME.primary }}>Palavras que constroem</h1>
              <p className="mt-2 max-w-xl text-base leading-7 text-slate-600">Aprenda, reflita e coloque em prática com uma etapa de cada vez.</p>
            </div>
            <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>15 min</span><span>·</span><span>4 etapas</span><span>·</span><span>Comece onde parou</span>
            </div>
          </div>
          <div className="border-t border-black/5 px-5 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium" style={{ color: DEMO_THEME.primary }}>Seu progresso</span>
              <span className="text-slate-500">{Math.min(progress, 100)}% concluído</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.max(progress, state.completed.length ? 25 : 0)}%`, backgroundColor: DEMO_THEME.primary }} /></div>
          </div>
        </section>

        <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden" aria-label="Etapas do estudo">
          {steps.map((item, index) => <button key={item.key} type="button" onClick={() => setState((current) => ({ ...current, step: index }))} className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${index === state.step ? "font-semibold shadow-sm" : "bg-white text-slate-500"}`} style={index === state.step ? { backgroundColor: `${DEMO_THEME.primary}10`, borderColor: `${DEMO_THEME.primary}55`, color: DEMO_THEME.primary } : undefined}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]" style={completedSet.has(index) ? { backgroundColor: DEMO_THEME.primary, color: "#fff" } : { backgroundColor: "#e8ebe6", color: "#607267" }}>{completedSet.has(index) ? <Check className="h-3 w-3" /> : index + 1}</span><span className="min-w-0 truncate">{item.label}</span></button>)}
        </div>

        <section className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:block">
            <p className="mb-4 font-display text-lg font-bold" style={{ color: DEMO_THEME.primary }}>Etapas do estudo</p>
            <div className="relative space-y-1 before:absolute before:bottom-6 before:left-[18px] before:top-6 before:w-px before:bg-slate-200">
              {steps.map((item, index) => {
                const active = state.step === index;
                return <button key={item.key} type="button" onClick={() => setState((current) => ({ ...current, step: index }))} className={`relative flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${active ? "shadow-sm" : "hover:bg-slate-50"}`} style={active ? { backgroundColor: `${DEMO_THEME.primary}0d`, color: DEMO_THEME.primary } : { color: "#647168" }}><StepCircle index={index} active={active} complete={completedSet.has(index)} /><span className="min-w-0"><span className="block text-sm font-semibold">{index + 1}. {item.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.shortLabel}</span></span></button>;
              })}
            </div>
            <div className="mt-5 border-t border-black/5 pt-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leitura guiada</p><p className="mt-2 text-sm leading-6 text-slate-600">Você pode voltar a qualquer etapa sem perder o que já escreveu.</p></div>
          </aside>

          <article className="min-w-0 rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: DEMO_THEME.secondary }}>{step.eyebrow}</p><h2 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl" style={{ color: DEMO_THEME.primary }}>{step.title}</h2></div><div className="hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-medium sm:block" style={{ backgroundColor: `${DEMO_THEME.secondary}18`, color: DEMO_THEME.primary }}>Palavras que constroem</div></div>
              <div className="mt-5 flex gap-1" aria-label={`Progresso: etapa ${state.step + 1} de ${steps.length}`}>{steps.map((item, index) => <span key={item.key} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: index <= state.step || completedSet.has(index) ? DEMO_THEME.primary : "#e4e7e2" }} />)}</div>
            </div>
            <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              {step.reference ? <div className="rounded-2xl border-l-4 px-4 py-4 sm:px-5" style={{ borderColor: DEMO_THEME.secondary, backgroundColor: `${DEMO_THEME.secondary}10` }}><p className="font-display text-lg font-bold" style={{ color: DEMO_THEME.primary }}>{step.reference}</p><p className="mt-2 font-serif text-lg leading-8 text-slate-700">“{step.body}”</p></div> : null}
              {step.paragraphs?.map((paragraph) => <p key={paragraph} className="font-serif text-lg leading-8 text-slate-700">{paragraph}</p>)}
              {step.question ? <div className="space-y-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: DEMO_THEME.secondary }}>Pense com calma</p><p className="mt-1 font-display text-xl font-bold" style={{ color: DEMO_THEME.primary }}>Qual atitude ajuda a construir relacionamentos?</p></div>{step.options?.map((option) => { const selected = state.answer === option; return <button key={option} type="button" onClick={() => setState((current) => ({ ...current, answer: option }))} className="flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left transition-colors" style={selected ? { borderColor: DEMO_THEME.primary, backgroundColor: `${DEMO_THEME.primary}0b`, color: DEMO_THEME.primary } : { borderColor: "#dfe3de", backgroundColor: "#fff", color: "#33423a" }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? DEMO_THEME.primary : "#a9b1aa" }}>{selected ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEMO_THEME.primary }} /> : null}</span><span className="text-base">{option}</span></button>; })}{state.answer === step.correctOption ? <div className="flex gap-3 rounded-xl p-4" style={{ backgroundColor: `${DEMO_THEME.primary}10`, color: DEMO_THEME.primary }}><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Isso!</p><p className="mt-1 text-sm leading-6">{step.explanation}</p></div></div> : null}</div> : null}
              <div className="rounded-2xl border border-black/5 bg-[#fbfaf6] p-4 sm:p-5"><div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0" style={{ color: DEMO_THEME.secondary }} /><div><p className="font-semibold" style={{ color: DEMO_THEME.primary }}>{step.key === "aplique" ? "Uma pequena prática" : "Para refletir"}</p><p className="mt-1 text-sm leading-6 text-slate-600">{step.key === "aplique" ? "Escolha uma conversa real para praticar a escuta antes de responder." : "Que parte deste estudo conversa com o seu momento atual?"}</p></div></div></div>
              <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={goBack} disabled={state.step === 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Voltar</button><button type="button" onClick={isLast ? restart : continueStep} disabled={!canContinue} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: DEMO_THEME.primary }}>{isLast ? "Recomeçar exemplo" : state.step === 0 ? "Entender a mensagem" : "Próxima etapa"}<ArrowRight className="h-4 w-4" /></button></div>
            </div>
          </article>

          <aside className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${DEMO_THEME.primary}10`, color: DEMO_THEME.primary }}><MessageSquareText className="h-5 w-5" /></span><div><p className="font-display text-lg font-bold" style={{ color: DEMO_THEME.primary }}>Minhas anotações</p><p className="mt-1 text-xs leading-5 text-slate-500">Escreva algo para lembrar desta etapa.</p></div></div>
            <textarea value={state.note} onChange={(event) => updateNote(event.target.value)} rows={8} maxLength={4000} placeholder="O que quero levar para a minha semana?" className="mt-4 min-h-40 w-full resize-y rounded-xl border border-slate-200 bg-[#fcfbf8] p-3 text-sm leading-6 text-slate-700 outline-none transition-shadow placeholder:text-slate-400 focus:border-[var(--foundation-primary)] focus:ring-2 focus:ring-[var(--foundation-primary)]/15" />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">{saved ? <><Check className="h-3.5 w-3.5" style={{ color: DEMO_THEME.primary }} />Salvo nesta prévia</> : <><Save className="h-3.5 w-3.5" />Salvando…</>}</p>
            <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: `${DEMO_THEME.secondary}12` }}><p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: DEMO_THEME.secondary }}>A qualquer momento</p><p className="mt-2 text-sm leading-6 text-slate-600">Volte para uma etapa anterior para revisar sua resposta ou completar a anotação.</p></div>
          </aside>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-xs text-slate-500"><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Este é um estudo de exemplo para avaliação visual.</span><button type="button" onClick={restart} className="font-semibold hover:underline" style={{ color: DEMO_THEME.primary }}>Limpar prévia</button></div>
      </div>
    </main>
  );
}
