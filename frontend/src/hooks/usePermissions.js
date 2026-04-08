function buildLegacyCapabilities(user) {
  const capabilities = new Set();
  const level = Number(user?.nivel_acesso || 0);
  const isPlatformAdmin = Boolean(user?.is_global_admin || user?.is_superuser);

  if (isPlatformAdmin) {
    [
      "manage_platform",
      "manage_church",
      "manage_ministry",
      "view_members",
      "manage_members",
      "view_music_module",
      "manage_music",
      "manage_cultos",
      "manage_escalas",
      "manage_setlists",
      "view_auditoria",
    ].forEach((capability) => capabilities.add(capability));
    return [...capabilities];
  }

  if (user?.ministerio_id) {
    capabilities.add("view_music_module");
  }

  if (level === 1) {
    [
      "manage_ministry",
      "view_members",
      "manage_members",
      "manage_music",
      "manage_cultos",
      "manage_escalas",
      "manage_setlists",
      "view_auditoria",
    ].forEach((capability) => capabilities.add(capability));
  } else if (level === 2) {
    [
      "manage_music",
      "manage_cultos",
      "manage_escalas",
      "manage_setlists",
    ].forEach((capability) => capabilities.add(capability));
  }

  return [...capabilities];
}

export function usePermissions(user) {
  const resolvedCapabilities =
    Array.isArray(user?.capabilities) && user.capabilities.length > 0
      ? [...new Set(user.capabilities)]
      : buildLegacyCapabilities(user);

  const capabilitySet = new Set(resolvedCapabilities);
  const authorizationRoles = user?.authorization_roles || {};
  const isGlobalAdmin =
    authorizationRoles.platform === "platform_super_admin" ||
    Boolean(user?.is_global_admin || user?.is_superuser);
  const isImpersonating = isGlobalAdmin && Boolean(user?.ministerio_id);
  const isMinistryAdmin =
    authorizationRoles.ministry === "ministry_admin" ||
    (!isGlobalAdmin && capabilitySet.has("manage_members"));
  const isLeader =
    authorizationRoles.ministry === "ministry_leader" ||
    (!isGlobalAdmin &&
      !isMinistryAdmin &&
      capabilitySet.has("manage_cultos"));
  const isMember = !isGlobalAdmin && !isMinistryAdmin && !isLeader;

  const hasCapability = (capability) => capabilitySet.has(capability);

  return {
    capabilities: resolvedCapabilities,
    hasCapability,
    isGlobalAdmin,
    isImpersonating,
    isMinistryAdmin,
    isLeader,
    isMember,
    canViewMinistrySettings:
      Boolean(user?.ministerio_id) &&
      (hasCapability("manage_ministry") || hasCapability("manage_church")),
    canEditMinistrySettings:
      Boolean(user?.ministerio_id) &&
      (hasCapability("manage_ministry") || hasCapability("manage_church")),
    canManageMembers: hasCapability("manage_members"),
    canViewMembers: hasCapability("view_members") || hasCapability("manage_members"),
    canViewMusicModule: hasCapability("view_music_module"),
    canManageMusic: hasCapability("manage_music"),
    canManageCultos: hasCapability("manage_cultos"),
    canManageEscalas: hasCapability("manage_escalas"),
    canManageSetlists: hasCapability("manage_setlists"),
    canManageMusicModule:
      hasCapability("manage_music") ||
      hasCapability("manage_cultos") ||
      hasCapability("manage_escalas") ||
      hasCapability("manage_setlists"),
    canViewAuditoria: hasCapability("view_auditoria"),
  };
}
