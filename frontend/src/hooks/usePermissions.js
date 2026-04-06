export function usePermissions(user) {
  const level = Number(user?.nivel_acesso || 0);
  const isGlobalAdmin = Boolean(user?.is_global_admin);
  const isMinistryAdmin = !isGlobalAdmin && level === 1;
  const isLeader = !isGlobalAdmin && level === 2;
  const isMember = !isGlobalAdmin && level === 3;

  return {
    isGlobalAdmin,
    isMinistryAdmin,
    isLeader,
    isMember,
    canViewMinistrySettings: !isGlobalAdmin && Boolean(user?.ministerio_id),
    canEditMinistrySettings: !isGlobalAdmin && level !== 3,
    canManageMusic: isGlobalAdmin || level === 1 || level === 2,
    canManageCultos: isGlobalAdmin || level === 1,
  };
}
