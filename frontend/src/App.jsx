import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import Musicas from "./pages/Musicas";
import Cultos from "./pages/Cultos";
import Membros from "./pages/Membros";
import Login from "./pages/Login";

function DashboardResumo() {
  return (
    <div>
      <h2 className="text-primary">Bem-vindo ao Lauda!</h2>
      <p className="text-muted">
        Selecione uma opção no menu lateral para começar.
      </p>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        {/* NOVO: Fundo escuro que aparece no mobile. Se clicar nele, fecha o menu. */}
        <div
          className={`sidebar-overlay ${isMobileMenuOpen ? "open" : ""}`}
          onClick={closeMenu}
        ></div>

        <aside className={`lauda-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
          <div className="lauda-logo">
            <span>🎶</span> Lauda
          </div>
          <nav className="lauda-nav">
            <Link to="/" className="lauda-nav-item" onClick={closeMenu}>
              <span>🏠</span> Dashboard
            </Link>
            <Link to="/musicas" className="lauda-nav-item" onClick={closeMenu}>
              <span>🎵</span> Músicas
            </Link>
            <Link to="/cultos" className="lauda-nav-item" onClick={closeMenu}>
              <span>📅</span> Cultos
            </Link>
            <Link to="/membros" className="lauda-nav-item" onClick={closeMenu}>
              <span>👥</span> Membros
            </Link>
          </nav>
        </aside>

        <main className="lauda-main-zone">
          <header className="lauda-header">
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              {/* NOVO: Botão Hamburguer */}
              <button className="menu-toggle-btn" onClick={toggleMenu}>
                ☰
              </button>
              <h1>Ministério de Louvor</h1>
            </div>

            <div className="lauda-user-profile">
              <button
                onClick={handleLogout}
                className="lauda-btn lauda-btn-secondary"
                style={{ padding: "5px 10px", fontSize: "0.8rem" }}
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
