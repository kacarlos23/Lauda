import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import { useAuth } from "./context/AuthContext";
import { authFetch } from "./lib/api";
import { AppShell } from "./core/layout/AppShell";
import {
  AdminLoginRoute,
  MemberLoginRoute,
  RequireAdminRoute,
  RequireAnyCapabilityRoute,
  RequireMemberRoute,
  RequireModuleRoute,
  RequireUnboundMemberRoute,
  RootRedirect,
} from "./core/routing/guards";
import { MODULE_KEY_MUSIC } from "./lib/constants";
import AdminDashboard from "./pages/AdminDashboard";
import Auditoria from "./pages/Auditoria";
import ClassificacoesMusicais from "./pages/ClassificacoesMusicais";
import Cultos from "./pages/Cultos";
import Dashboard from "./pages/Dashboard";
import EnterCode from "./pages/EnterCode";
import Equipes from "./pages/Equipes";
import Invite from "./pages/Invite";
import Login from "./pages/Login";
import Membros from "./pages/Membros";
import MinisterioConfiguracoes from "./pages/MinisterioConfiguracoes";
import Musicas from "./pages/Musicas";
import Perfil from "./pages/Perfil";

function App() {
  const { session, logout, updateUser } = useAuth();

  useEffect(() => {
    if (!session?.access) {
      return;
    }

    authFetch("/api/usuarios/me/", session.access)
      .then((profile) => {
        updateUser(profile);
      })
      .catch((error) => {
        if (
          error.status === 401 ||
          error.message?.toLowerCase().includes("token")
        ) {
          logout();
        }
      });
  }, [logout, session?.access, updateUser]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <MemberLoginRoute>
            <Login mode="member" />
          </MemberLoginRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <AdminLoginRoute>
            <Login mode="admin" />
          </AdminLoginRoute>
        }
      />
      <Route path="/invite" element={<Invite />} />
      <Route path="/invite/:code" element={<Invite />} />

      <Route element={<RequireUnboundMemberRoute />}>
        <Route path="/enter-code" element={<EnterCode />} />
      </Route>

      <Route element={<RequireMemberRoute />}>
        <Route element={<AppShell variant="member" />}>
          <Route path="/app" element={<Dashboard />} />
          <Route
            element={
              <RequireModuleRoute
                moduleKey={MODULE_KEY_MUSIC}
                fallbackTo="/app"
              />
            }
          >
            <Route path="/app/musicas" element={<Musicas />} />
            <Route path="/app/cultos" element={<Cultos />} />
            <Route path="/app/equipes" element={<Equipes />} />
            <Route
              element={
                <RequireAnyCapabilityRoute
                  capabilities={["manage_ministry", "manage_church"]}
                />
              }
            >
              <Route
                path="/app/ministerio/classificacoes"
                element={<ClassificacoesMusicais />}
              />
            </Route>
          </Route>
          <Route path="/app/perfil" element={<Perfil />} />

          <Route
            element={
              <RequireAnyCapabilityRoute
                capabilities={["manage_ministry", "manage_church"]}
              />
            }
          >
            <Route
              path="/app/ministerio/configuracoes"
              element={<MinisterioConfiguracoes />}
            />
          </Route>
          <Route
            element={
              <RequireAnyCapabilityRoute capabilities={["manage_members"]} />
            }
          >
            <Route path="/app/membros" element={<Membros />} />
          </Route>
          <Route
            element={
              <RequireAnyCapabilityRoute capabilities={["view_auditoria"]} />
            }
          >
            <Route path="/app/auditoria" element={<Auditoria />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireAdminRoute />}>
        <Route element={<AppShell variant="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/membros" element={<Membros />} />
          <Route path="/admin/auditoria" element={<Auditoria />} />
          <Route path="/admin/perfil" element={<Perfil />} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default App;
