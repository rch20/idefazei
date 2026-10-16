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

/**
 * A entrada inicial é global para todos os perfis. As responsabilidades
 * específicas aparecem dentro da Home, enquanto cada módulo continua
 * protegido pelas permissões server-side da sua própria rota.
 */
export function getChurchHomePath(_access: ChurchHomeAccess | null | undefined) {
  return "/app/inicio";
}
