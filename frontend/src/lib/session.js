const STORAGE_KEY = "lauda_session";

export function normalizeSession(session) {
  if (!session) {
    return null;
  }

  const user = session.user
    ? {
        ...session.user,
        is_global_admin: session.user.is_global_admin ?? false,
        is_superuser: session.user.is_superuser ?? false,
        igreja_id: session.user.igreja_id ?? null,
        igreja_slug: session.user.igreja_slug ?? null,
        igreja_nome: session.user.igreja_nome ?? null,
        igreja_membership_id: session.user.igreja_membership_id ?? null,
        igreja_membership_papel: session.user.igreja_membership_papel ?? null,
        ministerio_membership_id: session.user.ministerio_membership_id ?? null,
        ministerio_membership_papel: session.user.ministerio_membership_papel ?? null,
        ministerio_membership_is_primary:
          session.user.ministerio_membership_is_primary ?? false,
        has_institutional_membership:
          session.user.has_institutional_membership ?? false,
        authorization_roles: session.user.authorization_roles ?? {},
        capabilities: Array.isArray(session.user.capabilities)
          ? [...new Set(session.user.capabilities)]
          : [],
        active_modules: Array.isArray(session.user.active_modules)
          ? [...new Set(session.user.active_modules)]
          : [],
        igreja_vinculo: session.user.igreja_vinculo ?? null,
        ministerio_vinculo_principal:
          session.user.ministerio_vinculo_principal ?? null,
      }
    : null;

  return {
    ...session,
    user,
  };
}

export function loadStoredSession() {
  const token = localStorage.getItem("token");
  const rawSession = localStorage.getItem(STORAGE_KEY);

  if (!token || !rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession);
    return normalizeSession({ ...session, access: token });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    return null;
  }
}

export function persistSession(session) {
  const normalizedSession = normalizeSession(session);
  localStorage.setItem("token", normalizedSession.access);
  if (normalizedSession.refresh) {
    localStorage.setItem("refresh", normalizedSession.refresh);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession));
  return normalizedSession;
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
  localStorage.removeItem(STORAGE_KEY);
}
