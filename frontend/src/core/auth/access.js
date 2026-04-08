import { buildInvitePath, buildLoginPath, getAccessCodeFromSearch } from "../../lib/accessCode";
import { resolveModuleEntry } from "../../modules/registry";

export function canAccessReactAdmin(user) {
  return Boolean(user?.is_superuser);
}

export function resolveAuthorizedAppEntry(user) {
  if (!user?.ministerio_id) {
    return "/enter-code";
  }

  const activeModules = Array.isArray(user?.active_modules) ? user.active_modules : [];
  const capabilities = new Set(Array.isArray(user?.capabilities) ? user.capabilities : []);

  const moduleEntry = resolveModuleEntry(activeModules);
  if (moduleEntry) {
    return moduleEntry;
  }
  if (capabilities.has("manage_members")) {
    return "/app/membros";
  }
  if (capabilities.has("manage_ministry") || capabilities.has("manage_church")) {
    return "/app/ministerio/configuracoes";
  }
  if (capabilities.has("view_auditoria")) {
    return "/app/auditoria";
  }

  return "/app/perfil";
}

export function resolveMemberDestination(session, search = "") {
  if (!session) {
    return buildLoginPath(getAccessCodeFromSearch(search));
  }

  if (canAccessReactAdmin(session.user) && !session.user?.ministerio_id) {
    return "/admin";
  }

  if (session.user?.ministerio_id) {
    return resolveAuthorizedAppEntry(session.user);
  }

  const requestedCode = getAccessCodeFromSearch(search);
  return requestedCode ? buildInvitePath(requestedCode) : "/enter-code";
}
