import { useChurch } from "@/components/ChurchLayout";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { LeadershipStudyReader } from "./LeadershipStudyReader";
import type { StudentStudy } from "./types";

export default function LeadershipStudyReaderPage() {
  const { churchId } = useChurch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const enrollmentId = Number(params.get("enrollmentId"));
  const studyId = Number(params.get("studyId"));
  const history = trpc.escolaLideres.study.student.history.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId), retry: false }
  );
  const item = (history.data as StudentStudy[] | undefined)?.find(
    row => row.enrollment.id === enrollmentId && row.study.id === studyId
  );

  if (history.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-64 animate-pulse rounded-2xl bg-muted/30" />
      </div>
    );
  }
  if (!churchId || !item) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-semibold text-[#1e3a5f]">
              Estudo não encontrado
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Volte à sua formação e abra um estudo publicado para sua
              matrícula.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <LeadershipStudyReader
        churchId={churchId}
        item={item}
        onClose={() => setLocation("/app/escola-lideres/aluno")}
        onChanged={() => {
          void history.refetch();
        }}
      />
    </div>
  );
}
