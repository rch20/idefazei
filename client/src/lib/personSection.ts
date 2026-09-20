export const PERSON_SECTION_VALUES = ["resumo", "jornada", "participacoes", "cuidado", "cobertura", "historico"] as const;

export type PersonSection = typeof PERSON_SECTION_VALUES[number];

export type PersonSectionAccess = {
  canManagePastoralCoverage: boolean;
  accessPending: boolean;
};

/**
 * Resolves a requested profile section without allowing a pastoral deep link
 * to bypass the access state already established by the page queries.
 *
 * `null` means the requested section must remain visually deferred while its
 * authorization context is still loading.
 */
export function resolvePersonSection(
  requestedSection: PersonSection,
  access: PersonSectionAccess,
): PersonSection | null {
  if (requestedSection !== "cobertura") return requestedSection;
  if (access.accessPending) return null;
  return access.canManagePastoralCoverage ? "cobertura" : "resumo";
}
