import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { buildLoginPath, getAccessCodeFromSearch } from "../../lib/accessCode";
import { canAccessReactAdmin, resolveMemberDestination } from "../auth/access";

export function RootRedirect() {
  const { session } = useAuth();
  const location = useLocation();

  return (
    <Navigate to={resolveMemberDestination(session, location.search)} replace />
  );
}

export function MemberLoginRoute({ children }) {
  const { session } = useAuth();
  const location = useLocation();

  if (session) {
    return (
      <Navigate
        to={resolveMemberDestination(session, location.search)}
        replace
      />
    );
  }

  return children;
}

export function AdminLoginRoute({ children }) {
  const { session } = useAuth();

  if (!session) {
    return children;
  }

  if (canAccessReactAdmin(session.user)) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to={resolveMemberDestination(session)} replace />;
}

export function RequireMemberRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return (
      <Navigate
        to={buildLoginPath(getAccessCodeFromSearch(location.search))}
        replace
      />
    );
  }

  if (canAccessReactAdmin(session.user) && !session.user?.ministerio_id) {
    return <Navigate to="/admin" replace />;
  }

  if (!session.user?.ministerio_id) {
    return <Navigate to="/enter-code" replace />;
  }

  return <Outlet />;
}

export function RequireAdminRoute() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!canAccessReactAdmin(session.user)) {
    return <Navigate to={resolveMemberDestination(session)} replace />;
  }

  return <Outlet />;
}

export function RequireUnboundMemberRoute() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (canAccessReactAdmin(session.user) && !session.user?.ministerio_id) {
    return <Navigate to="/admin" replace />;
  }

  if (session.user?.ministerio_id) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export function RequireOperationalAdminRoute() {
  const { session, hasCapability } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCapability("manage_members") && !hasCapability("view_auditoria")) {
    return <Navigate to={resolveMemberDestination(session)} replace />;
  }

  return <Outlet />;
}

export function RequireModuleRoute({ moduleKey, fallbackTo = "/app" }) {
  const { session, hasModule } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!hasModule(moduleKey)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <Outlet />;
}

export function RequireAnyCapabilityRoute({
  capabilities,
  fallbackTo,
}) {
  const { session, hasCapability } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const allowed = capabilities.some((capability) => hasCapability(capability));
  if (!allowed) {
    return <Navigate to={fallbackTo || resolveMemberDestination(session)} replace />;
  }

  return <Outlet />;
}
