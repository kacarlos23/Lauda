import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

import Musicas from "./pages/Musicas";
import Cultos from "./pages/Cultos";
import Membros from "./pages/Membros";
import Login from "./pages/Login";

// Componente do Dashboard
function DashboardResumo() {
  const [stats, setStats] = useState({
    musicas: 0,
    membros: 0,
    cultos: 0,
    minhasEscalas: 0, // Adicionado para o futuro
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

    // Usamos Promise.all para buscar todos os dados em paralelo
    Promise.all([
      fetch(`${urlLimpa}/api/musicas/`, { headers }),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }),
      fetch(`${urlLimpa}/api/cultos/`, { headers }),
    ])
      .then(async (responses) => {
        const [musicasRes, membrosRes, cultosRes] = responses;
        // Checa se algum token expirou
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
          minhasEscalas: 0, // Lógica a ser implementada
        });

        // Filtra e ordena os próximos cultos
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
        const futuros = cultos
          .filter((culto) => new Date(culto.data) >= hoje)
          .sort((a, b) => new Date(a.data) - new Date(b.data));
        setProximosCultos(futuros.slice(0, 5)); // Pega os próximos 5
      })
      .catch((error) => console.error("Erro ao carregar dashboard:", error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
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
        <h2 className="text-primary">Agenda de Cultos</h2>
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
  // NOVO: Controle da barra lateral reduzida (desktop)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // === NOVO: ESTADO DO MODO ESCURO ===
  // Inicia lendo o localStorage para ver se o usuário já preferia o modo escuro
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Toda vez que isDarkMode mudar, aplicamos a classe no <body> da página
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark"); // Salva a preferência
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleMenu = () => {
    // Alterna ambos os estados simultaneamente.
    // O CSS vai decidir se abre em sobreposição (mobile) ou encolhe (desktop).
    setIsMenuOpen(!isMenuOpen);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  // Se não tem token, mostra APENAS a tela de login
  if (!token) {
    return <Login setToken={setToken} />;
  }

  // Se tem token, mostra o sistema normal
  return (
    <BrowserRouter>
      <div className="lauda-wrapper">
        <div
          className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
          onClick={closeMenu}
        ></div>

        <aside
          className={`lauda-sidebar ${isMenuOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
          <div className="lauda-logo">
            <span className="nav-icon">🎶</span>
            <span className="logo-text">Lauda</span>
          </div>
          <nav className="lauda-nav">
            <NavLink to="/" className="lauda-nav-item" onClick={closeMenu} end>
              <span className="nav-icon">🏠</span>{" "}
              <span className="nav-text">Dashboard</span>
            </NavLink>
            <NavLink
              to="/musicas"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              <span className="nav-icon">🎵</span>{" "}
              <span className="nav-text">Músicas</span>
            </NavLink>
            <NavLink
              to="/cultos"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              <span className="nav-icon">📅</span>{" "}
              <span className="nav-text">Cultos</span>
            </NavLink>
            <NavLink
              to="/membros"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              <span className="nav-icon">👥</span>{" "}
              <span className="nav-text">Membros</span>
            </NavLink>
          </nav>
        </aside>

        <main className="lauda-main-zone">
          <header className="lauda-header">
            <div className="lauda-header-left">
              {/* NOVO: Botão Hamburguer */}
              <button className="menu-toggle-btn" onClick={toggleMenu}>
                ☰
              </button>
              <h1>Ministério de Louvor</h1>
            </div>

            <div className="lauda-user-profile">
              {/* NOVO: Botão de alternar tema (Sol/Lua) */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="theme-toggle-btn"
                title="Alternar Modo Escuro"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              <button
                onClick={handleLogout}
                className="lauda-btn lauda-btn-secondary logout-btn"
              >
                Sair
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
