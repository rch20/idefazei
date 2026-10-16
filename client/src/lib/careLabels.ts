export const CARE_ROLE_LABELS = {
  quem_ganhou: "Quem ganhou",
  consolidador: "Consolidador da Consolidação",
  lider_celula: "Líder de Célula",
  discipulador: "Discipulador principal",
  pastor: "Pastor responsável",
} as const;

export function getCareRoleLabel(role: string | null | undefined) {
  if (!role) return "Papel não informado";
  return CARE_ROLE_LABELS[role as keyof typeof CARE_ROLE_LABELS] ?? role.replace(/_/g, " ");
}
