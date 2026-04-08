import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mockUseAuth = vi.fn();
const mockAuthFetch = vi.fn();

vi.mock("./context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./hooks/usePermissions", () => ({
  usePermissions: () => ({
    capabilities: [],
    hasCapability: () => false,
    isGlobalAdmin: false,
    isImpersonating: false,
    isMinistryAdmin: false,
    isLeader: false,
    isMember: true,
    canViewMinistrySettings: false,
    canEditMinistrySettings: false,
    canManageMembers: false,
    canViewMembers: false,
    canManageMusic: false,
    canManageCultos: false,
    canManageEscalas: false,
    canManageSetlists: false,
    canManageMusicModule: false,
    canViewMusicModule: false,
    canViewAuditoria: false,
  }),
}));

vi.mock("./components/MinistryNameLink", () => ({
  default: ({ children }) => <span>{children}</span>,
}));

vi.mock("./lib/api", () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

vi.mock("./pages/AdminDashboard", () => ({
  default: () => <div>AdminDashboard Page</div>,
}));

vi.mock("./pages/Auditoria", () => ({
  default: () => <div>Auditoria Page</div>,
}));

vi.mock("./pages/ClassificacoesMusicais", () => ({
  default: () => <div>Classificacoes Page</div>,
}));

vi.mock("./pages/Cultos", () => ({
  default: () => <div>Cultos Page</div>,
}));

vi.mock("./pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("./pages/EnterCode", () => ({
  default: () => <div>EnterCode Page</div>,
}));

vi.mock("./pages/Equipes", () => ({
  default: () => <div>Equipes Page</div>,
}));

vi.mock("./pages/Invite", () => ({
  default: () => <div>Invite Page</div>,
}));

vi.mock("./pages/Login", () => ({
  default: ({ mode }) => <div>{mode === "admin" ? "Admin Login Page" : "Member Login Page"}</div>,
}));

vi.mock("./pages/Membros", () => ({
  default: () => <div>Membros Page</div>,
}));

vi.mock("./pages/MinisterioConfiguracoes", () => ({
  default: () => <div>Ministerio Configuracoes Page</div>,
}));

vi.mock("./pages/Musicas", () => ({
  default: () => <div>Musicas Page</div>,
}));

vi.mock("./pages/Perfil", () => ({
  default: () => <div>Perfil Page</div>,
}));

function buildUser(overrides = {}) {
  return {
    id: 1,
    username: "tester",
    first_name: "Teste",
    last_name: "Usuario",
    email: "teste@example.com",
    ministerio_id: 99,
    ministerio_nome: "Ministerio Base",
    ministerio_slug: "ministerio-base",
    nivel_acesso: 3,
    is_global_admin: false,
    is_superuser: false,
    authorization_roles: {},
    capabilities: [],
    active_modules: ["music"],
    ...overrides,
  };
}

function renderWithSession(route, userOverrides = {}) {
  const user = buildUser(userOverrides);
  const authState = {
    session: {
      access: "token",
      refresh: "refresh",
      user,
    },
    token: "token",
    user,
    activeModules: user.active_modules || [],
    capabilities: user.capabilities || [],
    hasModule: (moduleKey) => (user.active_modules || []).includes(moduleKey),
    hasCapability: (capability) => (user.capabilities || []).includes(capability),
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    impersonateMinistry: vi.fn(),
  };

  mockUseAuth.mockReturnValue(authState);

  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

  return authState;
}

describe("admin route protection", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation((path) => {
      if (path === "/api/ministerios/") {
        return Promise.resolve([]);
      }

      if (path === "/api/usuarios/me/") {
        return Promise.resolve({});
      }

      return Promise.resolve([]);
    });
  });

  it("permite /admin apenas para superuser", async () => {
    renderWithSession("/admin", {
      is_superuser: true,
      is_global_admin: true,
      ministerio_id: null,
      ministerio_nome: null,
      ministerio_slug: null,
    });

    expect(await screen.findByText("AdminDashboard Page")).toBeInTheDocument();
  });

  it("bloqueia /admin para global admin sem superuser", async () => {
    renderWithSession("/admin", {
      is_global_admin: true,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboard Page")).not.toBeInTheDocument();
  });

  it("bloqueia /admin para admin local sem superuser", async () => {
    renderWithSession("/admin", {
      nivel_acesso: 1,
      is_global_admin: false,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboard Page")).not.toBeInTheDocument();
  });

  it("bloqueia /admin para usuario comum", async () => {
    renderWithSession("/admin", {
      nivel_acesso: 3,
      is_global_admin: false,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboard Page")).not.toBeInTheDocument();
  });

  it("nao redireciona /admin/login para /admin quando o usuario nao e superuser", async () => {
    renderWithSession("/admin/login", {
      is_global_admin: true,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboard Page")).not.toBeInTheDocument();
  });

  it("nao envia global admin sem superuser para /admin no redirecionamento raiz", async () => {
    renderWithSession("/", {
      is_global_admin: true,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboard Page")).not.toBeInTheDocument();
  });

  it("remove o link visual do painel global para quem nao e superuser", async () => {
    renderWithSession("/app", {
      is_global_admin: true,
      is_superuser: false,
    });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Painel Global" })).not.toBeInTheDocument();
  });
});
