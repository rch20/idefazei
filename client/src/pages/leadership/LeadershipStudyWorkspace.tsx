import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Layers3,
  Link2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const STAGES = [
  { key: "leia", label: "Leia", hint: "Leitura e reflexão inicial" },
  { key: "entenda", label: "Entenda", hint: "Explicação e compreensão" },
  { key: "responda", label: "Responda", hint: "Perguntas e respostas" },
  { key: "aplique", label: "Aplique", hint: "Prática e compromisso" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

type ModuleRow = {
  module: {
    id: number;
    title: string;
    description: string | null;
    position: number;
    active: boolean;
  };
};
type StudyRow = {
  study: {
    id: number;
    classId: number;
    moduleId: number | null;
    title: string;
    summary: string | null;
    content: string | null;
    weekStart: string | null;
    position: number;
    status: "rascunho" | "publicada" | "arquivada";
    active: boolean;
  };
  module: ModuleRow["module"] | null;
};
type Block = {
  id: number;
  stageKey: StageKey;
  title: string;
  content: string;
  reflectionPrompt: string | null;
  position: number;
  active: boolean;
};
type QuestionRow = {
  block: { id: number; stageKey: StageKey };
  question: {
    id: number;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
    position: number;
    active: boolean;
  };
};
type StudyDetail = {
  study: StudyRow["study"];
  blocks: Block[];
  questions: QuestionRow[];
  materials: Array<{
    id: number;
    libraryItemId: number;
    position: number;
    notes: string | null;
    title: string;
    type: string;
    fileUrl: string;
    description: string | null;
  }>;
  status: {
    canPublish: boolean;
    missingStages: StageKey[];
    hasQuestionInResponda: boolean;
    activeBlockCount: number;
    questionCount: number;
  };
};
type LibraryItem = {
  id: number;
  title: string;
  type: string;
  fileUrl: string;
  description?: string | null;
};

const EMPTY_MODULE = { title: "", description: "" };
const EMPTY_STUDY = {
  title: "",
  summary: "",
  content: "",
  weekStart: "",
  moduleId: "none",
};
const EMPTY_BLOCK = { title: "", content: "", reflectionPrompt: "" };
const newOptions = () => [
  { id: "a", label: "" },
  { id: "b", label: "" },
];

function statusLabel(status: StudyRow["study"]["status"]) {
  return status === "publicada"
    ? "Publicada"
    : status === "arquivada"
      ? "Arquivada"
      : "Rascunho";
}

export function LeadershipStudyWorkspace({
  churchId,
  classId,
  defaultOpen = false,
}: {
  churchId: number;
  classId: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageKey>("leia");
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null
  );
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState(EMPTY_MODULE);
  const [studyForm, setStudyForm] = useState(EMPTY_STUDY);
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK);
  const [questionForm, setQuestionForm] = useState({
    prompt: "",
    options: newOptions(),
    correctOptionId: "a",
    explanation: "",
  });
  const [libraryItemId, setLibraryItemId] = useState("none");
  const [moduleDirty, setModuleDirty] = useState(false);
  const [studyDirty, setStudyDirty] = useState(false);
  const [blockDirty, setBlockDirty] = useState(false);
  const [questionDirty, setQuestionDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStage, setPreviewStage] = useState<StageKey>("leia");

  const utils = trpc.useUtils();
  const modulesQuery = trpc.escolaLideres.study.modules.list.useQuery(
    { churchId, classId, includeInactive: true },
    { enabled: open, retry: false }
  );
  const studiesQuery = trpc.escolaLideres.study.studies.list.useQuery(
    { churchId, classId, includeInactive: true },
    { enabled: open, retry: false }
  );
  const studyQuery = trpc.escolaLideres.study.studies.get.useQuery(
    { churchId, id: selectedStudyId ?? 0 },
    { enabled: open && selectedStudyId !== null, retry: false }
  );
  const libraryQuery = trpc.library.list.useQuery(
    { churchId },
    { enabled: open && selectedStudyId !== null, retry: false }
  );

  const modules = (modulesQuery.data ?? []) as ModuleRow[];
  const studies = (studiesQuery.data ?? []) as StudyRow[];
  const studyDetail = studyQuery.data as StudyDetail | undefined;
  const libraryItems = (libraryQuery.data ?? []) as LibraryItem[];
  const visibleStudies = useMemo(
    () =>
      selectedModuleId === null
        ? studies
        : studies.filter(item => item.study.moduleId === selectedModuleId),
    [selectedModuleId, studies]
  );
  const blocks = studyDetail?.blocks ?? [];
  const stageBlocks = blocks.filter(block => block.stageKey === selectedStage);
  const selectedBlock =
    blocks.find(block => block.id === selectedBlockId) ?? stageBlocks[0];
  const selectedQuestion = studyDetail?.questions.find(
    row => row.question.id === selectedQuestionId
  );
  const stageLabel =
    STAGES.find(stage => stage.key === selectedStage)?.label ?? "Etapa";

  useEffect(() => {
    if (
      !selectedModuleId ||
      !modules.some(item => item.module.id === selectedModuleId)
    ) {
      setSelectedModuleId(modules[0]?.module.id ?? null);
    }
  }, [modules, selectedModuleId]);

  useEffect(() => {
    if (
      selectedStudyId !== null &&
      !visibleStudies.some(item => item.study.id === selectedStudyId)
    ) {
      setSelectedStudyId(visibleStudies[0]?.study.id ?? null);
    }
  }, [selectedStudyId, visibleStudies]);

  useEffect(() => {
    if (!selectedStudyId || !studyDetail?.study || studyDirty) return;
    setStudyForm({
      title: studyDetail.study.title,
      summary: studyDetail.study.summary ?? "",
      content: studyDetail.study.content ?? "",
      weekStart: studyDetail.study.weekStart ?? "",
      moduleId: studyDetail.study.moduleId
        ? String(studyDetail.study.moduleId)
        : "none",
    });
  }, [selectedStudyId, studyDetail, studyDirty]);

  useEffect(() => {
    if (!selectedBlock || blockDirty) return;
    setBlockForm({
      title: selectedBlock.title,
      content: selectedBlock.content,
      reflectionPrompt: selectedBlock.reflectionPrompt ?? "",
    });
  }, [selectedBlock, blockDirty]);

  useEffect(() => {
    if (!selectedQuestion || questionDirty) return;
    setQuestionForm({
      prompt: selectedQuestion.question.prompt,
      options: selectedQuestion.question.options.map(option => ({ ...option })),
      correctOptionId: selectedQuestion.question.correctOptionId,
      explanation: selectedQuestion.question.explanation,
    });
  }, [selectedQuestion, questionDirty]);

  useEffect(() => {
    if (
      selectedBlockId !== null &&
      !stageBlocks.some(block => block.id === selectedBlockId)
    ) {
      setSelectedBlockId(stageBlocks[0]?.id ?? null);
      setBlockDirty(false);
    }
  }, [selectedBlockId, stageBlocks]);

  const invalidateContent = async () => {
    await Promise.all([
      utils.escolaLideres.study.modules.list.invalidate({ churchId, classId }),
      utils.escolaLideres.study.studies.list.invalidate({ churchId, classId }),
      selectedStudyId === null
        ? Promise.resolve()
        : utils.escolaLideres.study.studies.get.invalidate({
            churchId,
            id: selectedStudyId,
          }),
    ]);
  };

  const createModule = trpc.escolaLideres.study.modules.create.useMutation({
    onSuccess: async data => {
      toast.success("Módulo criado.");
      setModuleForm(EMPTY_MODULE);
      setModuleDirty(false);
      await utils.escolaLideres.study.modules.list.invalidate({
        churchId,
        classId,
      });
      setSelectedModuleId(data.id);
    },
    onError: error => toast.error(error.message),
  });
  const updateModule = trpc.escolaLideres.study.modules.update.useMutation({
    onSuccess: async () => {
      toast.success("Módulo atualizado.");
      setModuleDirty(false);
      await utils.escolaLideres.study.modules.list.invalidate({
        churchId,
        classId,
      });
    },
    onError: error => toast.error(error.message),
  });
  const createStudy = trpc.escolaLideres.study.studies.create.useMutation({
    onSuccess: async data => {
      toast.success("Estudo criado como rascunho.");
      setSelectedStage("leia");
      setSelectedBlockId(null);
      setSelectedQuestionId(null);
      setStudyDirty(false);
      await utils.escolaLideres.study.studies.list.invalidate({
        churchId,
        classId,
      });
      setSelectedStudyId(data.id);
    },
    onError: error => toast.error(error.message),
  });
  const updateStudy = trpc.escolaLideres.study.studies.update.useMutation({
    onSuccess: async () => {
      toast.success("Estudo salvo.");
      setStudyDirty(false);
      await invalidateContent();
    },
    onError: error => toast.error(error.message),
  });
  const createBlock = trpc.escolaLideres.study.blocks.create.useMutation({
    onSuccess: async data => {
      toast.success("Etapa adicionada.");
      setSelectedBlockId(data.id);
      setBlockDirty(false);
      if (selectedStudyId !== null)
        await utils.escolaLideres.study.studies.get.invalidate({
          churchId,
          id: selectedStudyId,
        });
    },
    onError: error => toast.error(error.message),
  });
  const updateBlock = trpc.escolaLideres.study.blocks.update.useMutation({
    onSuccess: async () => {
      toast.success("Etapa salva.");
      setBlockDirty(false);
      if (selectedStudyId !== null)
        await utils.escolaLideres.study.studies.get.invalidate({
          churchId,
          id: selectedStudyId,
        });
    },
    onError: error => toast.error(error.message),
  });
  const createQuestion = trpc.escolaLideres.study.questions.create.useMutation({
    onSuccess: async data => {
      toast.success("Pergunta adicionada.");
      setSelectedQuestionId(data.id);
      setQuestionDirty(false);
      if (selectedStudyId !== null)
        await utils.escolaLideres.study.studies.get.invalidate({
          churchId,
          id: selectedStudyId,
        });
    },
    onError: error => toast.error(error.message),
  });
  const updateQuestion = trpc.escolaLideres.study.questions.update.useMutation({
    onSuccess: async () => {
      toast.success("Pergunta salva.");
      setQuestionDirty(false);
      if (selectedStudyId !== null)
        await utils.escolaLideres.study.studies.get.invalidate({
          churchId,
          id: selectedStudyId,
        });
    },
    onError: error => toast.error(error.message),
  });
  const publishStudy = trpc.escolaLideres.study.studies.publish.useMutation({
    onSuccess: async () => {
      toast.success("Estudo publicado.");
      await invalidateContent();
    },
    onError: error => toast.error(error.message),
  });
  const archiveStudy = trpc.escolaLideres.study.studies.archive.useMutation({
    onSuccess: async () => {
      toast.success("Estudo arquivado.");
      await invalidateContent();
    },
    onError: error => toast.error(error.message),
  });
  const attachMaterial = trpc.escolaLideres.study.materials.attach.useMutation({
    onSuccess: async () => {
      toast.success("Material vinculado.");
      setLibraryItemId("none");
      await invalidateContent();
    },
    onError: error => toast.error(error.message),
  });
  const detachMaterial = trpc.escolaLideres.study.materials.detach.useMutation({
    onSuccess: invalidateContent,
    onError: error => toast.error(error.message),
  });

  const beginNewStudy = () => {
    setSelectedStudyId(null);
    setStudyForm({
      ...EMPTY_STUDY,
      moduleId: selectedModuleId ? String(selectedModuleId) : "none",
    });
    setStudyDirty(true);
  };
  const beginNewModule = () => {
    setEditingModuleId(null);
    setModuleForm(EMPTY_MODULE);
    setModuleDirty(false);
  };
  const beginNewBlock = () => {
    setSelectedBlockId(null);
    setBlockForm(EMPTY_BLOCK);
    setBlockDirty(true);
  };
  const beginNewQuestion = () => {
    setSelectedQuestionId(null);
    setQuestionForm({
      prompt: "",
      options: newOptions(),
      correctOptionId: "a",
      explanation: "",
    });
    setQuestionDirty(true);
  };

  return (
    <Card className="mt-4 border-[#6366f1]/20 bg-[#fbfcff]">
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setOpen(current => !current)}
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-[#1e3a5f]/10 p-2 text-[#1e3a5f]">
              <BookOpen className="h-5 w-5" />
            </span>
            <span>
              <CardTitle className="text-base text-[#1e3a5f]">
                Conteúdo pedagógico
              </CardTitle>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Módulos, estudos e etapas que o aluno vai percorrer
              </span>
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card className="border-border bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-[#1e3a5f]">
                  <Layers3 className="h-4 w-4 text-[#c9a84c]" />
                  Módulos da turma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`module-title-${classId}`}>
                      {editingModuleId ? "Editar módulo" : "Novo módulo"}
                    </Label>
                    {editingModuleId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={beginNewModule}
                      >
                        Novo
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    id={`module-title-${classId}`}
                    value={moduleForm.title}
                    onChange={event => {
                      setModuleDirty(true);
                      setModuleForm(current => ({
                        ...current,
                        title: event.target.value,
                      }));
                    }}
                    placeholder="Ex.: Identidade do líder"
                    maxLength={160}
                  />
                  <Input
                    value={moduleForm.description}
                    onChange={event => {
                      setModuleDirty(true);
                      setModuleForm(current => ({
                        ...current,
                        description: event.target.value,
                      }));
                    }}
                    placeholder="Descrição curta (opcional)"
                    maxLength={500}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={
                    moduleForm.title.trim().length < 2 ||
                    createModule.isPending ||
                    updateModule.isPending
                  }
                  onClick={() => {
                    if (editingModuleId) {
                      updateModule.mutate({
                        churchId,
                        classId,
                        id: editingModuleId,
                        title: moduleForm.title,
                        description: moduleForm.description || null,
                      });
                    } else {
                      createModule.mutate({
                        churchId,
                        classId,
                        title: moduleForm.title,
                        description: moduleForm.description || null,
                      });
                    }
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingModuleId ? "Salvar módulo" : "Criar módulo"}
                </Button>
                <div className="space-y-2 border-t border-border pt-3">
                  {modules.map(item => (
                    <button
                      key={item.module.id}
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(item.module.id);
                        setSelectedStudyId(null);
                        setEditingModuleId(item.module.id);
                        setModuleForm({
                          title: item.module.title,
                          description: item.module.description ?? "",
                        });
                        setModuleDirty(false);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedModuleId === item.module.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border hover:border-[#c9a84c]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-[#1e3a5f]">
                          {item.module.title}
                        </span>
                        <Badge
                          variant={item.module.active ? "secondary" : "outline"}
                        >
                          {item.module.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {item.module.description ? (
                        <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                          {item.module.description}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  {!modules.length ? (
                    <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                      Crie o primeiro módulo para organizar os estudos.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-white">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm text-[#1e3a5f]">
                    <FileText className="h-4 w-4 text-[#c9a84c]" />
                    Estudos
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selecione um módulo para filtrar ou veja todos.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={beginNewStudy}
                  disabled={!modules.length}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Novo estudo
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={
                    selectedModuleId === null ? "all" : String(selectedModuleId)
                  }
                  onValueChange={value => {
                    setSelectedModuleId(value === "all" ? null : Number(value));
                    setSelectedStudyId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os módulos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os módulos</SelectItem>
                    {modules.map(item => (
                      <SelectItem
                        key={item.module.id}
                        value={String(item.module.id)}
                      >
                        {item.module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  {visibleStudies.map(item => (
                    <button
                      key={item.study.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudyId(item.study.id);
                        setSelectedQuestionId(null);
                        setStudyDirty(false);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedStudyId === item.study.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border hover:border-[#c9a84c]"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-semibold text-[#1e3a5f]">
                          {item.study.title}
                        </span>
                        <Badge
                          variant={
                            item.study.status === "publicada"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {statusLabel(item.study.status)}
                        </Badge>
                      </div>
                      {item.module ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.module.title}
                        </span>
                      ) : (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Sem módulo
                        </span>
                      )}
                    </button>
                  ))}
                  {!visibleStudies.length ? (
                    <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                      Ainda não há estudos nesta seleção.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {studyDirty && selectedStudyId === null ? (
            <Card className="border-[#c9a84c]/40 bg-[#fffdf7]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1e3a5f]">
                  Novo estudo
                </CardTitle>
                <p className="text-xs font-normal text-muted-foreground">
                  Salve as informações para liberar o editor das quatro etapas.
                </p>
              </CardHeader>
              <CardContent>
                <StudyForm
                  form={studyForm}
                  setForm={next => {
                    setStudyDirty(true);
                    setStudyForm(next);
                  }}
                  modules={modules}
                  saving={createStudy.isPending}
                  onSubmit={() =>
                    createStudy.mutate({
                      churchId,
                      classId,
                      moduleId:
                        studyForm.moduleId === "none"
                          ? null
                          : Number(studyForm.moduleId),
                      title: studyForm.title,
                      summary: studyForm.summary || null,
                      content: studyForm.content || null,
                      weekStart: studyForm.weekStart || null,
                      clientRequestId: crypto.randomUUID(),
                      requestSchemaVersion: 1,
                    })
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          {selectedStudyId !== null && studyDetail ? (
            <div className="space-y-5">
              <Card className="border-[#1e3a5f]/20 bg-white">
                <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg text-[#1e3a5f]">
                        {studyDetail.study.title}
                      </CardTitle>
                      <Badge
                        variant={
                          studyDetail.study.status === "publicada"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {statusLabel(studyDetail.study.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prepare o estudo na mesma ordem em que o aluno vai
                      realizá-lo.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewStage("leia");
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Prévia do aluno
                    </Button>
                    {studyDetail.study.status !== "publicada" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !studyDetail.status.canPublish ||
                          publishStudy.isPending
                        }
                        onClick={() =>
                          publishStudy.mutate({ churchId, id: selectedStudyId })
                        }
                      >
                        <Send className="mr-1 h-4 w-4" />
                        Publicar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={archiveStudy.isPending}
                        onClick={() =>
                          archiveStudy.mutate({ churchId, id: selectedStudyId })
                        }
                      >
                        Arquivar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <StudyForm
                    form={studyForm}
                    setForm={next => {
                      setStudyDirty(true);
                      setStudyForm(next);
                    }}
                    modules={modules}
                    saving={updateStudy.isPending}
                    onSubmit={() =>
                      updateStudy.mutate({
                        churchId,
                        id: selectedStudyId,
                        moduleId:
                          studyForm.moduleId === "none"
                            ? null
                            : Number(studyForm.moduleId),
                        title: studyForm.title,
                        summary: studyForm.summary || null,
                        weekStart: studyForm.weekStart || null,
                      })
                    }
                  />
                </CardContent>
              </Card>

              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-[#1e3a5f]">
                      Prévia do aluno
                    </DialogTitle>
                    <DialogDescription>
                      Esta prévia é somente leitura. Nada será salvo na
                      matrícula, no progresso ou nas anotações.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STAGES.map(stage => (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => setPreviewStage(stage.key)}
                        className={`rounded-lg border px-2 py-2 text-left text-sm font-semibold ${previewStage === stage.key ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-border hover:border-[#c9a84c]"}`}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[55dvh] space-y-4 overflow-y-auto rounded-xl border border-border bg-[#fffdf7] p-4 sm:p-6">
                    <div>
                      <Badge variant="secondary">
                        {
                          STAGES.find(stage => stage.key === previewStage)
                            ?.label
                        }
                      </Badge>
                      <h3 className="mt-2 text-xl font-semibold text-[#1e3a5f]">
                        {studyDetail.study.title}
                      </h3>
                      {studyDetail.study.summary ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {studyDetail.study.summary}
                        </p>
                      ) : null}
                    </div>
                    {blocks
                      .filter(block => block.stageKey === previewStage)
                      .map(block => (
                        <div
                          key={block.id}
                          className="space-y-3 border-t border-border pt-4"
                        >
                          <h4 className="font-semibold text-[#1e3a5f]">
                            {block.title}
                          </h4>
                          <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                            {block.content}
                          </p>
                          {block.reflectionPrompt ? (
                            <div className="rounded-lg border border-[#c9a84c]/30 bg-[#fdfaf1] p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a84c]">
                                Para refletir
                              </p>
                              <p className="mt-1 text-sm text-[#1e3a5f]">
                                {block.reflectionPrompt}
                              </p>
                            </div>
                          ) : null}
                          {studyDetail.questions
                            .filter(row => row.block.id === block.id)
                            .map(row => (
                              <div
                                key={row.question.id}
                                className="rounded-lg border bg-white p-3"
                              >
                                <p className="text-sm font-semibold">
                                  {row.question.prompt}
                                </p>
                                <div className="mt-2 grid gap-2">
                                  {row.question.options.map(option => (
                                    <div
                                      key={option.id}
                                      className="rounded border px-3 py-2 text-sm text-muted-foreground"
                                    >
                                      {option.label}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    {!blocks.some(block => block.stageKey === previewStage) ? (
                      <p className="text-sm text-muted-foreground">
                        Esta etapa ainda não tem conteúdo.
                      </p>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>

              <Card className="border-[#c9a84c]/25 bg-[#fffdf7]">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base text-[#1e3a5f]">
                        Etapas do estudo
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {studyDetail.status.activeBlockCount} etapas ativas ·{" "}
                        {studyDetail.status.questionCount} perguntas
                      </p>
                    </div>
                    <Badge
                      variant={
                        studyDetail.status.canPublish ? "default" : "outline"
                      }
                    >
                      {studyDetail.status.canPublish
                        ? "Pronto para publicar"
                        : `Falta: ${
                            studyDetail.status.missingStages
                              .map(
                                key =>
                                  STAGES.find(stage => stage.key === key)?.label
                              )
                              .filter(Boolean)
                              .join(", ") || "pergunta em Responda"
                          }`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {STAGES.map(stage => (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => {
                          setSelectedStage(stage.key);
                          setSelectedBlockId(null);
                          setSelectedQuestionId(null);
                          setBlockDirty(false);
                          setQuestionDirty(false);
                        }}
                        className={`rounded-xl border px-3 py-3 text-left ${selectedStage === stage.key ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-border bg-white hover:border-[#c9a84c]"}`}
                      >
                        <span className="block text-sm font-semibold">
                          {stage.label}
                        </span>
                        <span
                          className={`mt-1 block text-[11px] ${selectedStage === stage.key ? "text-white/80" : "text-muted-foreground"}`}
                        >
                          {stage.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Blocos de {stageLabel}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={beginNewBlock}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Novo bloco
                        </Button>
                      </div>
                      {stageBlocks.map(block => (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => {
                            setSelectedBlockId(block.id);
                            setSelectedQuestionId(null);
                            setBlockDirty(false);
                          }}
                          className={`w-full rounded-xl border p-3 text-left ${selectedBlock?.id === block.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border bg-white hover:border-[#c9a84c]"}`}
                        >
                          <span className="block font-semibold text-[#1e3a5f]">
                            {block.title}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                            {block.content}
                          </span>
                        </button>
                      ))}
                      {!stageBlocks.length ? (
                        <p className="rounded-lg bg-white p-3 text-xs text-muted-foreground">
                          Adicione o primeiro bloco desta etapa.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      {blockDirty && selectedBlockId === null ? (
                        <BlockForm
                          stage={selectedStage}
                          form={blockForm}
                          setForm={next => {
                            setBlockDirty(true);
                            setBlockForm(next);
                          }}
                          saving={createBlock.isPending}
                          onSubmit={() =>
                            createBlock.mutate({
                              churchId,
                              studyId: selectedStudyId,
                              stageKey: selectedStage,
                              title: blockForm.title,
                              content: blockForm.content,
                              reflectionPrompt:
                                blockForm.reflectionPrompt || null,
                            })
                          }
                        />
                      ) : selectedBlock ? (
                        <BlockForm
                          stage={selectedBlock.stageKey}
                          form={blockForm}
                          setForm={next => {
                            setBlockDirty(true);
                            setBlockForm(next);
                          }}
                          saving={updateBlock.isPending}
                          onSubmit={() =>
                            updateBlock.mutate({
                              churchId,
                              studyId: selectedStudyId,
                              id: selectedBlock.id,
                              stageKey: selectedBlock.stageKey,
                              title: blockForm.title,
                              content: blockForm.content,
                              reflectionPrompt:
                                blockForm.reflectionPrompt || null,
                            })
                          }
                        />
                      ) : (
                        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                          Selecione um bloco ou crie um novo para começar.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedStage === "responda" && selectedBlock ? (
                    <QuestionEditor
                      studyId={selectedStudyId}
                      churchId={churchId}
                      blockId={selectedBlock.id}
                      rows={studyDetail.questions.filter(
                        row => row.block.id === selectedBlock.id
                      )}
                      selectedQuestionId={selectedQuestionId}
                      setSelectedQuestionId={id => {
                        setSelectedQuestionId(id);
                        setQuestionDirty(false);
                      }}
                      form={questionForm}
                      setForm={next => {
                        setQuestionDirty(true);
                        setQuestionForm(next);
                      }}
                      newQuestion={beginNewQuestion}
                      saving={
                        createQuestion.isPending || updateQuestion.isPending
                      }
                      onSubmit={() => {
                        if (selectedQuestionId === null)
                          createQuestion.mutate({
                            churchId,
                            studyId: selectedStudyId,
                            blockId: selectedBlock.id,
                            prompt: questionForm.prompt,
                            options: questionForm.options,
                            correctOptionId: questionForm.correctOptionId,
                            explanation: questionForm.explanation,
                            clientRequestId: crypto.randomUUID(),
                            requestSchemaVersion: 1,
                          });
                        else
                          updateQuestion.mutate({
                            churchId,
                            studyId: selectedStudyId,
                            blockId: selectedBlock.id,
                            id: selectedQuestionId,
                            prompt: questionForm.prompt,
                            options: questionForm.options,
                            correctOptionId: questionForm.correctOptionId,
                            explanation: questionForm.explanation,
                          });
                      }}
                    />
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-[#1e3a5f]">
                    <Link2 className="h-4 w-4 text-[#c9a84c]" />
                    Materiais da Biblioteca Digital
                  </CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Vincule referências existentes; nenhum arquivo é copiado.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={libraryItemId}
                      onValueChange={setLibraryItemId}
                    >
                      <SelectTrigger className="min-w-0 flex-1">
                        <SelectValue placeholder="Selecionar material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Selecionar material
                        </SelectItem>
                        {libraryItems
                          .filter(
                            item =>
                              !studyDetail.materials.some(
                                material => material.libraryItemId === item.id
                              )
                          )
                          .map(item => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      disabled={
                        libraryItemId === "none" || attachMaterial.isPending
                      }
                      onClick={() =>
                        attachMaterial.mutate({
                          churchId,
                          studyId: selectedStudyId,
                          libraryItemId: Number(libraryItemId),
                          position: studyDetail.materials.length,
                        })
                      }
                    >
                      Vincular
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {studyDetail.materials.map(material => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#1e3a5f]">
                            {material.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {material.type}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remover ${material.title}`}
                          onClick={() =>
                            detachMaterial.mutate({
                              churchId,
                              studyId: selectedStudyId,
                              id: material.id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    ))}
                    {!studyDetail.materials.length ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum material vinculado.
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function StudyForm({
  form,
  setForm,
  modules,
  saving,
  onSubmit,
}: {
  form: typeof EMPTY_STUDY;
  setForm: (value: typeof EMPTY_STUDY) => void;
  modules: ModuleRow[];
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="grid gap-3"
      onSubmit={event => {
        event.preventDefault();
        if (form.title.trim().length >= 3) onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
        <div className="space-y-2">
          <Label htmlFor="leadership-study-title">Título do estudo *</Label>
          <Input
            id="leadership-study-title"
            value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })}
            maxLength={160}
            placeholder="Ex.: O caráter que sustenta a liderança"
          />
        </div>
        <div className="space-y-2">
          <Label>Módulo</Label>
          <Select
            value={form.moduleId}
            onValueChange={moduleId => setForm({ ...form, moduleId })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem módulo</SelectItem>
              {modules.map(item => (
                <SelectItem key={item.module.id} value={String(item.module.id)}>
                  {item.module.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)]">
        <div className="space-y-2">
          <Label>Resumo</Label>
          <Input
            value={form.summary}
            onChange={event =>
              setForm({ ...form, summary: event.target.value })
            }
            maxLength={500}
            placeholder="O que o aluno vai aprender"
          />
        </div>
        <div className="space-y-2">
          <Label>Semana de referência</Label>
          <Input
            type="date"
            value={form.weekStart}
            onChange={event =>
              setForm({ ...form, weekStart: event.target.value })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Introdução</Label>
        <Textarea
          value={form.content}
          onChange={event => setForm({ ...form, content: event.target.value })}
          rows={3}
          maxLength={12000}
          placeholder="Contexto geral do estudo (opcional)"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || form.title.trim().length < 3}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando…" : "Salvar informações"}
        </Button>
      </div>
    </form>
  );
}

function BlockForm({
  stage,
  form,
  setForm,
  saving,
  onSubmit,
}: {
  stage: StageKey;
  form: typeof EMPTY_BLOCK;
  setForm: (value: typeof EMPTY_BLOCK) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  const label = STAGES.find(item => item.key === stage)?.label ?? stage;
  return (
    <form
      className="space-y-3 rounded-xl border border-[#1e3a5f]/15 bg-white p-4"
      onSubmit={event => {
        event.preventDefault();
        if (form.title.trim().length >= 2 && form.content.trim()) onSubmit();
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a84c]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#1e3a5f]">
          Conteúdo que aparece para o aluno
        </p>
      </div>
      <div className="space-y-2">
        <Label>Título do bloco *</Label>
        <Input
          value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })}
          maxLength={160}
          placeholder={`Ex.: ${label} da semana`}
        />
      </div>
      <div className="space-y-2">
        <Label>Conteúdo *</Label>
        <Textarea
          value={form.content}
          onChange={event => setForm({ ...form, content: event.target.value })}
          rows={7}
          maxLength={12000}
          placeholder="Escreva o conteúdo desta etapa..."
        />
      </div>
      <div className="space-y-2">
        <Label>Para refletir</Label>
        <Textarea
          value={form.reflectionPrompt}
          onChange={event =>
            setForm({ ...form, reflectionPrompt: event.target.value })
          }
          rows={3}
          maxLength={2000}
          placeholder="Pergunta que orienta a reflexão do aluno (opcional)"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            saving || form.title.trim().length < 2 || !form.content.trim()
          }
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando…" : "Salvar etapa"}
        </Button>
      </div>
    </form>
  );
}

function QuestionEditor({
  studyId,
  churchId,
  blockId,
  rows,
  selectedQuestionId,
  setSelectedQuestionId,
  form,
  setForm,
  newQuestion,
  saving,
  onSubmit,
}: {
  studyId: number;
  churchId: number;
  blockId: number;
  rows: QuestionRow[];
  selectedQuestionId: number | null;
  setSelectedQuestionId: (id: number | null) => void;
  form: {
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
  };
  setForm: (value: typeof form) => void;
  newQuestion: () => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perguntas
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={newQuestion}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova
          </Button>
        </div>
        {rows.map(row => (
          <button
            key={row.question.id}
            type="button"
            onClick={() => setSelectedQuestionId(row.question.id)}
            className={`w-full rounded-xl border p-3 text-left ${selectedQuestionId === row.question.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border hover:border-[#c9a84c]"}`}
          >
            <span className="block line-clamp-2 text-sm font-medium text-[#1e3a5f]">
              {row.question.prompt}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {row.question.options.length} alternativas
            </span>
          </button>
        ))}
        {!rows.length ? (
          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Adicione perguntas para liberar a publicação.
          </p>
        ) : null}
      </div>
      <form
        className="space-y-3 rounded-xl border border-[#1e3a5f]/15 bg-white p-4"
        onSubmit={event => {
          event.preventDefault();
          if (
            form.prompt.trim() &&
            form.options.every(option => option.label.trim()) &&
            form.explanation.trim()
          )
            onSubmit();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1e3a5f]">
              {selectedQuestionId === null
                ? "Nova pergunta"
                : "Editar pergunta"}
            </p>
            <p className="text-xs text-muted-foreground">
              A resposta correta fica protegida no servidor.
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-[#c9a84c]" />
        </div>
        <div className="space-y-2">
          <Label>Pergunta *</Label>
          <Textarea
            value={form.prompt}
            onChange={event => setForm({ ...form, prompt: event.target.value })}
            rows={3}
            maxLength={4000}
            placeholder="O que o aluno deve responder?"
          />
        </div>
        <div className="space-y-2">
          <Label>Alternativas *</Label>
          {form.options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={event =>
                  setForm({
                    ...form,
                    options: form.options.map(item =>
                      item.id === option.id
                        ? { ...item, label: event.target.value }
                        : item
                    ),
                  })
                }
                placeholder={`Alternativa ${index + 1}`}
                maxLength={500}
              />
              <Button
                type="button"
                size="icon"
                variant={
                  form.correctOptionId === option.id ? "default" : "outline"
                }
                aria-label={`Marcar alternativa ${index + 1} como correta`}
                onClick={() => setForm({ ...form, correctOptionId: option.id })}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Clique no círculo da alternativa correta.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Explicação da resposta *</Label>
          <Textarea
            value={form.explanation}
            onChange={event =>
              setForm({ ...form, explanation: event.target.value })
            }
            rows={3}
            maxLength={4000}
            placeholder="Explique o porquê da resposta."
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              saving ||
              !form.prompt.trim() ||
              !form.options.every(option => option.label.trim()) ||
              !form.explanation.trim()
            }
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar pergunta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
