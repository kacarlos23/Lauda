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
    id: 2,
    username: "modular-user",
    first_name: "Modulo",
    last_name: "Usuario",
    email: "modulo@example.com",
    ministerio_id: 42,
    ministerio_nome: "Ministerio Modular",
    ministerio_slug: "ministerio-modular",
    nivel_acesso: 3,
    is_global_admin: false,
    is_superuser: false,
    authorization_roles: {},
    capabilities: [],
    active_modules: ["music"],
    ...overrides,
  };
}

function renderWithModules(route, userOverrides = {}) {
  const user = buildUser(userOverrides);
  mockUseAuth.mockReturnValue({
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
  });

  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe("module-aware navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation((path) => {
      if (path === "/api/usuarios/me/") {
        return Promise.resolve({});
      }

      return Promise.resolve([]);
    });
  });

  it("shows the music navigation entry when music is active", async () => {
    renderWithModules("/app");

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Musicas" })).toBeInTheDocument();
  });

  it("redirects music routes to the dashboard when the module is absent", async () => {
    renderWithModules("/app/musicas", { active_modules: [] });

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Musicas Page")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Musicas" })).not.toBeInTheDocument();
  });

  it("redirects members route when the capability is absent", async () => {
    renderWithModules("/app/membros", {
      active_modules: [],
      capabilities: [],
    });

    expect(await screen.findByText("Perfil Page")).toBeInTheDocument();
    expect(screen.queryByText("Membros Page")).not.toBeInTheDocument();
  });

  it("allows members route when manage_members is present", async () => {
    renderWithModules("/app/membros", { capabilities: ["manage_members"] });

    expect(await screen.findByText("Membros Page")).toBeInTheDocument();
  });
});
