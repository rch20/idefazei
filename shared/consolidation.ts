export const ACTIVE_CONSOLIDATION_REFERRAL_STATUSES = [
  "pendente",
  "aprovado",
  "aceito",
  "em_acompanhamento",
] as const;

export type ActiveConsolidationReferralStatus = (typeof ACTIVE_CONSOLIDATION_REFERRAL_STATUSES)[number];

export const TERMINAL_CONSOLIDATION_REFERRAL_STATUSES = ["encerrado", "cancelado"] as const;

export type TerminalConsolidationReferralStatus = (typeof TERMINAL_CONSOLIDATION_REFERRAL_STATUSES)[number];

export type ConsolidationReferralResponsibility = {
  assignedToPersonId?: number | null;
  acceptedByPersonId?: number | null;
  acceptedByChurchUserId?: number | null;
};

export function isActiveConsolidationReferralStatus(status: string | null | undefined): status is ActiveConsolidationReferralStatus {
  return Boolean(status && (ACTIVE_CONSOLIDATION_REFERRAL_STATUSES as readonly string[]).includes(status));
}

export function isTerminalConsolidationReferralStatus(status: string | null | undefined): status is TerminalConsolidationReferralStatus {
  return Boolean(status && (TERMINAL_CONSOLIDATION_REFERRAL_STATUSES as readonly string[]).includes(status));
}

/**
 * Retorna a Pessoa responsável pelo caso moderno quando houver uma atribuição
 * pessoal. O responsável pastoral por conta é mantido separadamente em
 * acceptedByChurchUserId, porque uma conta da igreja pode não estar vinculada
 * a uma Pessoa.
 */
export function getConsolidationResponsiblePersonId(referral: ConsolidationReferralResponsibility): number | null {
  return referral.assignedToPersonId ?? referral.acceptedByPersonId ?? null;
}

export function hasConsolidationResponsible(referral: ConsolidationReferralResponsibility): boolean {
  return Boolean(getConsolidationResponsiblePersonId(referral) ?? referral.acceptedByChurchUserId);
}
