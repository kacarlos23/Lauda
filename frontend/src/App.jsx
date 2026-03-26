import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
// NOVO: Importando os ícones do Lucide React
import {
  Music,
  Home,
  Music2,
  Calendar,
  Users,
  Menu,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import "./App.css";

import Musicas from "./pages/Musicas";
import Cultos from "./pages/Cultos";
import Membros from "./pages/Membros";
import Login from "./pages/Login";

function DashboardResumo() {
  const [stats, setStats] = useState({
    musicas: 0,
    membros: 0,
    cultos: 0,
    minhasEscalas: 0,
  });
  const [proximosCultos, setProximosCultos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    Promise.all([
      fetch(`${urlLimpa}/api/musicas/`, { headers }),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }),
      fetch(`${urlLimpa}/api/cultos/`, { headers }),
    ])
      .then(async (responses) => {
        const [musicasRes, membrosRes, cultosRes] = responses;
        if (
          [musicasRes, membrosRes, cultosRes].some((res) => res.status === 401)
        ) {
          localStorage.removeItem("token");
          window.location.href = "/";
          throw new Error("Sessão expirada");
        }
        return Promise.all(responses.map((res) => res.json()));
      })
      .then(([musicas, membros, cultos]) => {
        setStats({
          musicas: musicas.length,
          membros: membros.length,
          cultos: cultos.length,
          minhasEscalas: 0,
        });

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const futuros = cultos
          .filter((culto) => new Date(culto.data) >= hoje)
          .sort((a, b) => new Date(a.data) - new Date(b.data));
        setProximosCultos(futuros.slice(0, 5));
      })
      .catch((error) => console.error("Erro ao carregar dashboard:", error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Carregando painel...
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-grid">
        <div className="lauda-card stat-card">
          <h3>{stats.cultos}</h3>
          <p>Próximos Cultos</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.musicas}</h3>
          <p>Músicas</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.membros}</h3>
          <p>Membros Ativos</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.minhasEscalas}</h3>
          <p>Minhas Escalas</p>
        </div>
      </div>

      <div className="agenda-section">
        <h2
          className="text-primary"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Calendar size={24} /> Agenda de Cultos
        </h2>
        <div className="lauda-card">
          {proximosCultos.length > 0 ? (
            proximosCultos.map((culto) => (
              <div key={culto.id} className="agenda-item">
                <span>
                  {new Date(culto.data).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <strong>{culto.nome}</strong>
              </div>
            ))
          ) : (
            <p className="text-muted">Nenhum culto agendado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (window.innerWidth > 768) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && touchStart < 50) setIsMenuOpen(true);
    if (isLeftSwipe && isMenuOpen) setIsMenuOpen(false);
  };

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <BrowserRouter>
      <div
        className="lauda-wrapper"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
          onClick={closeMenu}
        ></div>

        <aside
          className={`lauda-sidebar ${isMenuOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
          <div className="lauda-logo">
            {/* ÍCONE LUCIDE: Logo */}
            <span
              className="nav-icon"
              style={{ display: "flex", alignItems: "center" }}
            >
              <Music size={28} />
            </span>
            <span className="logo-text">Lauda</span>
          </div>
          <nav className="lauda-nav">
            <NavLink to="/" className="lauda-nav-item" onClick={closeMenu} end>
              {/* ÍCONE LUCIDE: Home */}
              <span
                className="nav-icon"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Home size={20} />
              </span>
              <span className="nav-text">Dashboard</span>
            </NavLink>
            <NavLink
              to="/musicas"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              {/* ÍCONE LUCIDE: Músicas */}
              <span
                className="nav-icon"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Music2 size={20} />
              </span>
              <span className="nav-text">Músicas</span>
            </NavLink>
            <NavLink
              to="/cultos"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              {/* ÍCONE LUCIDE: Cultos */}
              <span
                className="nav-icon"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={20} />
              </span>
              <span className="nav-text">Cultos</span>
            </NavLink>
            <NavLink
              to="/membros"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              {/* ÍCONE LUCIDE: Membros */}
              <span
                className="nav-icon"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={20} />
              </span>
              <span className="nav-text">Membros</span>
            </NavLink>
          </nav>
        </aside>

        <main className="lauda-main-zone">
          <header className="lauda-header">
            <div className="lauda-header-left">
              <button
                className="menu-toggle-btn"
                onClick={toggleMenu}
                title="Alternar Menu"
              >
                {/* ÍCONE LUCIDE: Menu Hamburguer */}
                <Menu size={22} />
              </button>
              <h1>Ministério de Louvor</h1>
            </div>

            <div className="lauda-user-profile">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="theme-toggle-btn"
                title="Alternar Modo Escuro"
                style={{ display: "flex", alignItems: "center" }}
              >
                {/* ÍCONE LUCIDE: Sol e Lua */}
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={handleLogout}
                className="lauda-btn lauda-btn-secondary logout-btn"
              >
                {/* ÍCONE LUCIDE: Sair */}
                <LogOut size={16} /> Sair
              </button>
            </div>
          </header>

          <div className="lauda-content">
            <Routes>
              <Route path="/" element={<DashboardResumo />} />
              <Route path="/musicas" element={<Musicas />} />
              <Route path="/cultos" element={<Cultos />} />
              <Route path="/membros" element={<Membros />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
