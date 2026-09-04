export type ChurchHomeAccess = {
  actorRole?: string | null;
  roles?: readonly string[] | null;
  isExecutive?: boolean;
  isPastoralWorker?: boolean;
  isConsolidator?: boolean;
  canAccessVisits?: boolean;
  canManageCells?: boolean;
  canManageMinistry?: boolean;
  canAccessTreasury?: boolean;
};

const PASTOR_ROLES = new Set(["pastor_presidente", "pastor_local"]);
const CELL_LEADERSHIP_ROLES = new Set(["lider", "supervisor"]);
const CONSOLIDATION_ROLES = new Set(["consolidador", "visitador"]);

/**
 * Retorna a entrada principal que o usuário pode acessar com seu conjunto
 * efetivo de funções. A ordem evita que capacidades amplas de pastor ou
 * supervisor escondam a área operacional mais útil para aquele perfil.
 */
export function getChurchHomePath(access: ChurchHomeAccess | null | undefined) {
  const roles = new Set([...(access?.roles ?? []), access?.actorRole].filter((role): role is string => Boolean(role)));

  if (Array.from(roles).some((role) => PASTOR_ROLES.has(role)) || roles.has("secretario")) {
    return "/app/dashboard";
  }

  if (CELL_LEADERSHIP_ROLES.has(access?.actorRole ?? "") || Array.from(roles).some((role) => CELL_LEADERSHIP_ROLES.has(role)) || access?.canManageCells) {
    return "/app/celulas";
  }

  if (access?.isConsolidator || Array.from(roles).some((role) => CONSOLIDATION_ROLES.has(role)) || access?.canAccessVisits) {
    return "/app/consolidacao";
  }

  if (access?.canAccessTreasury || roles.has("tesoureiro")) {
    return "/app/tesouraria";
  }

  if (access?.canManageMinistry) {
    return "/app/ministerios";
  }

  if (access?.isPastoralWorker) {
    return "/app/cuidado";
  }

  if (access?.isExecutive) {
    return "/app/dashboard";
  }

  return "/app/membro";
}
