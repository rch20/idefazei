import { trpc } from "@/lib/trpc";
import { formatCivilDate } from "@/lib/civilDate";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LibraryBig, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { StudyPartList } from "./StudyPartList";
import type { FoundationStudyPart } from "./StudyPartEditor";

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  pdf: "Documento",
  video: "Vídeo",
  apostila: "Apresentação",
  devocional: "Link",
};

type StudyTrailItemStudy = {
  id: number;
  courseId: number;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  active: boolean;
};

type StudyQuestionRow = {
  block: { id: number };
  question: {
    id: number;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
  };
};

type StudyMaterial = {
  id: number;
  title: string;
  type: string;
  fileUrl?: string | null;
};

export function StudyTrailItem({
  churchId,
  study,
  canManage,
  order,
  actions,
}: {
  churchId: number;
  study: StudyTrailItemStudy;
  canManage: boolean;
  order: number;
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: parts = [], isLoading: partsLoading } =
    trpc.escolaFundamentos.listQuestionBlocks.useQuery(
      { churchId, studyId: study.id },
      { enabled: expanded }
    );
  const { data: questions = [], isLoading: questionsLoading } =
    trpc.escolaFundamentos.manageStudyQuestions.useQuery(
      { churchId, studyId: study.id },
      { enabled: expanded }
    );
  const { data: materials = [], isLoading: materialsLoading } =
    trpc.escolaFundamentos.listStudyMaterials.useQuery(
      { churchId, studyId: study.id },
      { enabled: expanded }
    );
  const typedParts = parts as FoundationStudyPart[];
  const typedQuestions = questions as StudyQuestionRow[];
  const typedMaterials = materials as StudyMaterial[];
  const openPreview = () => {
    window.sessionStorage.setItem(
      "idefazei-foundation-study-preview-v1",
      JSON.stringify({ churchId, courseId: study.courseId, study })
    );
    window.location.assign("/app/escola-fundamentos/preview");
  };

  return (
    <article className="group relative rounded-xl border border-[#c9a84c]/20 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-start">
        <button
          type="button"
          className="flex w-full min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:ring-offset-2"
          aria-expanded={expanded}
          onClick={() => setExpanded(current => !current)}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
            {order}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-sm font-semibold text-[#1e3a5f]">
                {study.title}
              </span>
              {canManage ? (
                <Badge variant={study.active ? "default" : "secondary"}>
                  {study.active ? "Publicado" : "Rascunho"}
                </Badge>
              ) : null}
            </span>
            {study.weekStart ? (
              <span className="mt-1 block text-xs font-medium text-[#c9a84c]">
                Semana de{" "}
                {formatCivilDate(study.weekStart, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ) : null}
            {study.summary ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {study.summary}
              </span>
            ) : null}
            <span className="mt-2 block text-xs font-medium text-[#1e3a5f]">
              {expanded
                ? "Ocultar partes"
                : "Ver partes, perguntas e materiais"}
            </span>
          </span>
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-[#c9a84c] transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {canManage && actions ? (
          <div
            className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:shrink-0 xl:justify-end"
            onClick={event => event.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
        {canManage ? (
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center gap-1 self-start rounded-md px-2 text-xs font-semibold text-[#1e3a5f] hover:bg-[#fdfaf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            onClick={openPreview}
            aria-label={`Visualizar ${study.title} como aluno`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Prévia</span>
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="mt-3 space-y-4 border-t border-[#c9a84c]/15 pt-3 sm:ml-10">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Partes do estudo
              </p>
              {!partsLoading && typedParts.length ? (
                <span className="text-xs text-muted-foreground">
                  {typedParts.length} parte(s)
                </span>
              ) : null}
            </div>
            <StudyPartList
              churchId={churchId}
              studyId={study.id}
              parts={typedParts}
              questions={typedQuestions}
              isLoading={partsLoading}
              questionsLoading={questionsLoading}
              canManage={canManage}
            />
          </div>
          {!materialsLoading && typedMaterials.length ? (
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <LibraryBig className="h-3.5 w-3.5" />
                Materiais vinculados
              </p>
              <div className="space-y-2">
                {typedMaterials.map(material => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#fdfaf1] px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#1e3a5f]">
                        {material.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {MATERIAL_TYPE_LABELS[material.type] ?? material.type}
                      </span>
                    </span>
                    {material.fileUrl ? (
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[#1e3a5f] hover:text-[#c9a84c]"
                        aria-label={`Abrir ${material.title}`}
                        onClick={event => event.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
