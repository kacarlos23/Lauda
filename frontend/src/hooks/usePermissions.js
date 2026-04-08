export function usePermissions(user) {
  const isGlobalAdmin = Boolean(user?.is_global_admin);
  const isImpersonating = isGlobalAdmin && Boolean(user?.ministerio_id);
  const isMinistryAdmin = false;
  const isLeader = false;
  const isMember = !isGlobalAdmin;

  return {
    isGlobalAdmin,
    isImpersonating,
    isMinistryAdmin,
    isLeader,
    isMember,
    canViewMinistrySettings: Boolean(isGlobalAdmin && user?.ministerio_id),
    canEditMinistrySettings:
      Boolean(isGlobalAdmin && user?.ministerio_id),
    canManageMusic: isGlobalAdmin,
    canManageCultos: isGlobalAdmin && isImpersonating,
  };
}
