import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';

import Musicas from './pages/Musicas';
import Cultos from './pages/Cultos';
import Membros from './pages/Membros';
import Login from './pages/Login';

function DashboardResumo() {
  return (
    <div>
      <h2 className="text-primary">Bem-vindo ao Lauda!</h2>
      <p className="text-muted">Selecione uma opção no menu lateral para começar.</p>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
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
        <aside className="lauda-sidebar">
          <div className="lauda-logo"><span>🎶</span> Lauda</div>
          <nav className="lauda-nav">
            <Link to="/" className="lauda-nav-item"><span>🏠</span> Dashboard</Link>
            <Link to="/musicas" className="lauda-nav-item"><span>🎵</span> Músicas</Link>
            <Link to="/cultos" className="lauda-nav-item"><span>📅</span> Cultos</Link>
            <Link to="/membros" className="lauda-nav-item"><span>👥</span> Membros</Link>
          </nav>
        </aside>

        <main className="lauda-main-zone">
          <header className="lauda-header">
            <h1>Ministério de Louvor</h1>
            <div className="lauda-user-profile">
              {/* ALTERAÇÃO: removido style inline, agora usa classes CSS */}
              <button onClick={handleLogout} className="lauda-btn lauda-btn-secondary">
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
