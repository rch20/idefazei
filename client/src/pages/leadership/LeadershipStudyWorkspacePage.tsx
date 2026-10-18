import { useChurch } from "@/components/ChurchLayout";
import { Card, CardContent } from "@/components/ui/card";
import { LeadershipStudyWorkspace } from "./LeadershipStudyWorkspace";
import { Link } from "wouter";

export default function LeadershipStudyWorkspacePage() {
  const { churchId } = useChurch();
  const classId = Number(
    new URLSearchParams(window.location.search).get("classId")
  );

  if (!churchId || !Number.isInteger(classId) || classId < 1) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-semibold text-[#1e3a5f]">
              Turma não selecionada
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra o conteúdo pedagógico a partir de uma turma da Escola de
              Líderes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <Link href="/app/escola-lideres" className="mb-3 inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground">
        Voltar para turmas
      </Link>
      <LeadershipStudyWorkspace
        churchId={churchId}
        classId={classId}
        defaultOpen
      />
    </div>
  );
}
