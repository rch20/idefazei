export type StudentStudy = {
  study: {
    id: number;
    title: string;
    summary: string | null;
    content: string | null;
    status: "publicada";
    position: number;
  };
  enrollment: { id: number; classId: number };
  class: { id: number; name: string };
  progress: {
    status: "em_andamento" | "concluida";
    lastBlockPosition: number;
    completedAt: string | Date | null;
  } | null;
};
