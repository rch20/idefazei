import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { FoundationStudyPreviewDialog } from "./FoundationStudyPreviewDialog";

type PreviewStudy = {
  id: number;
  courseId: number;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
};

type PreviewPayload = {
  churchId: number;
  courseId: number;
  study: PreviewStudy;
};

const PREVIEW_SESSION_KEY = "idefazei-foundation-study-preview-v1";

export default function FoundationStudyPreviewPage() {
  const [, navigate] = useLocation();
  const { churchId, primaryColor, secondaryColor } = useChurch();
  const [payload, setPayload] = useState<PreviewPayload | null | undefined>(
    undefined
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PREVIEW_SESSION_KEY);
      window.sessionStorage.removeItem(PREVIEW_SESSION_KEY);
      if (!raw) return setPayload(null);
      const parsed = JSON.parse(raw) as Partial<PreviewPayload>;
      if (
        parsed.churchId !== churchId ||
        !parsed.courseId ||
        !parsed.study ||
        parsed.study.courseId !== parsed.courseId ||
        typeof parsed.study.id !== "number"
      )
        return setPayload(null);
      setPayload(parsed as PreviewPayload);
    } catch {
      setPayload(null);
    }
  }, [churchId]);

  if (payload === undefined)
    return (
      <div className="flex min-h-[45vh] items-center justify-center p-6 text-sm text-muted-foreground">
        Abrindo a prévia…
      </div>
    );
  if (!payload) {
    return (
      <div className="mx-auto flex min-h-[45vh] max-w-xl items-center justify-center p-6 text-center">
        <div>
          <p className="font-semibold text-[#1e3a5f]">
            Não foi possível localizar este estudo.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Volte para a gestão da Escola e selecione novamente uma prévia.
          </p>
          <Button
            type="button"
            className="mt-4 bg-[#1e3a5f] text-white"
            onClick={() => navigate("/app/escola-fundamentos")}
          >
            Voltar para a Escola
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FoundationStudyPreviewDialog
      churchId={churchId}
      study={payload.study}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      open
      onOpenChange={open => {
        if (!open) navigate("/app/escola-fundamentos");
      }}
    />
  );
}
