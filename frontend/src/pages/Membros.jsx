import { useCallback, useEffect, useRef, useState } from "react";
import {
  Lock,
  UserPlus,
  Users,
  Edit,
  Activity,
  Search,
  Shield,
  Save,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../lib/api";
import "./Membros.css";

const ESTADO_INICIAL_USUARIO = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  telefone: "",
  funcao_principal: "",
  funcoes: [],
  nivel_acesso: 3,
  is_active: true,
};

export default function Membros() {
  const { token, user, updateUser, logout } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const [senhaData, setSenhaData] = useState({
    password: "",
    confirm_password: "",
  });
  const [novoUsuario, setNovoUsuario] = useState(ESTADO_INICIAL_USUARIO);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const painelInicializadoRef = useRef(false);

  const [filtros, setFiltros] = useState({
    busca: "",
    nivel: "",
    status: "ativos",
  });

  const canManageUsers = Boolean(isAdmin && user?.is_global_admin);

  const extrairMensagemErro = async (error, fallback) => {
    const dados = error?.data || null;
    return (
      dados?.detail ||
      Object.values(dados || {})
        .flat()
        .find(Boolean) ||
      fallback
    );
  };

  const atualizarUsuarioNaLista = (usuarioAtualizado) => {
    setUsuarios((atuais) => {
      const semDuplicado = atuais.filter(
        (usuarioItem) => usuarioItem.id !== usuarioAtualizado.id,
      );
      return [usuarioAtualizado, ...semDuplicado];
    });
  };

  const carregarDados = useCallback(async () => {
    if (!token) {
      return;
    }

    const [usuariosResult, logsResult] = await Promise.allSettled([
      authFetch("/api/usuarios/", token),
      authFetch("/api/auditoria/?page_size=5", token),
    ]);

    const failedAuthRequest = [usuariosResult, logsResult].find(
      (result) => result.status === "rejected" && result.reason?.status === 401,
    );
    if (failedAuthRequest) {
      logout();
      return;
    }

    if (usuariosResult.status === "fulfilled") {
      setIsAdmin(true);
      setUsuarios(usuariosResult.value);

      if (!painelInicializadoRef.current && usuariosResult.value.length > 0) {
        setUsuarioSelecionado(usuariosResult.value[0]);
        painelInicializadoRef.current = true;
      }
    } else {
      setIsAdmin(false);
      setUsuarios([]);
      setUsuarioSelecionado(null);
    }

    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value.results || logsResult.value);
    } else {
      setLogs([]);
      if (usuariosResult.status === "fulfilled") {
        setMensagem({
          texto: "Os usuarios foram carregados, mas a auditoria recente nao respondeu.",
          tipo: "error",
        });
      }
    }
  }, [logout, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      carregarDados();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarDados]);

  const exibirMensagem = (texto, tipo = "success") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 4000);
  };

  const handleAtualizarSenha = (e) => {
    e.preventDefault();
    if (senhaData.password !== senhaData.confirm_password) {
      exibirMensagem("As senhas não coincidem!", "error");
      return;
    }
    authFetch("/api/usuarios/me/", token, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: senhaData.password }),
    })
      .then((dadosAtualizados) => {
        if (dadosAtualizados && dadosAtualizados.id === user?.id) {
          updateUser(dadosAtualizados);
        }

        exibirMensagem("Sua senha foi atualizada com sucesso!");
        setSenhaData({ password: "", confirm_password: "" });
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        exibirMensagem("Erro ao atualizar senha.", "error");
      });
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    const payload = {
      ...novoUsuario,
      funcao_principal: novoUsuario.funcao_principal?.trim() || "",
    };

    try {
      const dados = await authFetch("/api/usuarios/", token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      atualizarUsuarioNaLista(dados);
      setUsuarioSelecionado(dados);
      painelInicializadoRef.current = true;
      exibirMensagem("Novo usuário cadastrado com sucesso!");
      setNovoUsuario(ESTADO_INICIAL_USUARIO);
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }

      const detalhe = await extrairMensagemErro(
        error,
        "Erro ao cadastrar. Verifique se o login já existe.",
      );
      exibirMensagem(detalhe, "error");
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();

    const dadosEnvio = { ...usuarioSelecionado };
    if (!dadosEnvio.password) delete dadosEnvio.password;

    try {
      const dadosAtualizados = await authFetch(
        `/api/usuarios/${usuarioSelecionado.id}/`,
        token,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dadosEnvio),
        },
      );

      atualizarUsuarioNaLista(dadosAtualizados);
      setUsuarioSelecionado(dadosAtualizados);

      if (dadosAtualizados.id === user?.id) {
        updateUser(dadosAtualizados);
      }

      exibirMensagem(`Dados de ${dadosAtualizados.username} atualizados!`);
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }

      exibirMensagem("Erro ao atualizar usuário.", "error");
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca = (u.username + u.first_name + u.email)
      .toLowerCase()
      .includes(filtros.busca.toLowerCase());
    const matchNivel = filtros.nivel
      ? u.nivel_acesso.toString() === filtros.nivel
      : true;
    const matchStatus =
      filtros.status === "ativos"
        ? u.is_active
        : filtros.status === "inativos"
          ? !u.is_active
          : true;
    return matchBusca && matchNivel && matchStatus;
  });

  const renderBadgeNivel = (usuario) => {
    if (usuario.is_global_admin) {
      return <span className="badge badge-primary">{usuario.papel_display || "Admin Global"}</span>;
    }
    if (usuario.nivel_acesso == 1) {
      return (
        <span className="badge badge-primary">{usuario.papel_display || usuario.nivel_acesso_label || "Administrador"}</span>
      );
    }
    if (usuario.nivel_acesso == 2) {
      return <span className="badge badge-secondary">{usuario.papel_display || usuario.nivel_acesso_label || "Líder de Louvor"}</span>;
    }
    return <span className="badge badge-gray">{usuario.papel_display || usuario.nivel_acesso_label || "Membro"}</span>;
  };

  return (
    <div className="membros-page">
      <div className="lauda-page-header">
        <div className="membros-header-content">
          <h2 className="text-primary membros-page-title">
            <Shield size={28} /> Usuários e Segurança
          </h2>
          <p className="text-muted">
            Gestão centralizada de acessos, senhas e perfis do sistema
          </p>
        </div>
      </div>

      {mensagem.texto && (
        <div
          className={`status-alert ${mensagem.tipo === "error" ? "status-alert--error" : "status-alert--success"}`}
        >
          <CheckCircle size={20} /> {mensagem.texto}
        </div>
      )}

      {/* SEÇÃO 1: MINHA SENHA */}
      <section className="lauda-card usuarios-secao">
        <h3 className="sec-header">
          <Lock size={18} /> Minha Senha
        </h3>
        <form onSubmit={handleAtualizarSenha} className="form-container">
          <div className="form-row">
            <div className="form-col form-col-md">
              <label className="input-label">Nova Senha</label>
              <input
                type="password"
                name="password"
                className="input-field"
                value={senhaData.password}
                onChange={(e) =>
                  setSenhaData({ ...senhaData, password: e.target.value })
                }
                required
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="form-col form-col-md">
              <label className="input-label">Confirmação da Nova Senha</label>
              <input
                type="password"
                name="confirm_password"
                className="input-field"
                value={senhaData.confirm_password}
                onChange={(e) =>
                  setSenhaData({
                    ...senhaData,
                    confirm_password: e.target.value,
                  })
                }
                required
                placeholder="Repita a senha"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Atualizar Senha
            </button>
          </div>
        </form>
      </section>

      {canManageUsers && (
        <>
          {/* SEÇÃO 2: NOVO USUÁRIO */}
          <section className="lauda-card usuarios-secao">
            <h3 className="sec-header">
              <UserPlus size={18} /> Cadastro de Novo Usuário
            </h3>
            <form onSubmit={handleCriarUsuario} className="novo-usuario-form">
              <div className="form-row">
                <div className="form-col form-col-sm">
                  <label className="input-label">Login (Username) *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={novoUsuario.username}
                    onChange={(e) =>
                      setNovoUsuario({
                        ...novoUsuario,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-col form-col-lg">
                  <label className="input-label">Nome Completo</label>
                  <input
                    type="text"
                    className="input-field"
                    value={novoUsuario.first_name}
                    onChange={(e) =>
                      setNovoUsuario({
                        ...novoUsuario,
                        first_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-col form-col-md">
                  <label className="input-label">E-mail</label>
                  <input
                    type="email"
                    className="input-field"
                    value={novoUsuario.email}
                    onChange={(e) =>
                      setNovoUsuario({ ...novoUsuario, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-col form-col-sm">
                  <label className="input-label">Senha Inicial *</label>
                  <input
                    type="password"
                    className="input-field"
                    value={novoUsuario.password}
                    onChange={(e) =>
                      setNovoUsuario({
                        ...novoUsuario,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-col form-col-md">
                  <label className="input-label">Perfil de Acesso</label>
                  <select
                    className="input-field"
                    value={novoUsuario.nivel_acesso}
                    onChange={(e) =>
                      setNovoUsuario({
                        ...novoUsuario,
                        nivel_acesso: parseInt(e.target.value),
                      })
                    }
                    required
                  >
                    <option value={1}>Administrador do Ministério</option>
                    <option value={2}>Líder de Louvor</option>
                    <option value={3}>Membro Padrão</option>
                  </select>
                  <span className="text-muted form-helper-text">
                    Administrador do ministério libera acesso ao painel administrativo local.
                  </span>
                </div>
                <div className="form-col form-col-sm checkbox-inline">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={novoUsuario.is_active}
                    onChange={(e) =>
                      setNovoUsuario({
                        ...novoUsuario,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="ativo">Usuário Ativo</label>
                </div>
                <button type="submit" className="lauda-btn lauda-btn-primary">
                  Criar Usuário
                </button>
              </div>
            </form>
          </section>

          {/* SEÇÃO 3 e 4: LISTA E PAINEL DE EDIÇÃO (GRID) */}
          <section className="usuarios-grid-wrapper">
            <div className="usuarios-grid">
            <section className="usuarios-tabela-col">
              <h3 className="sec-header">
                <Users size={18} /> Usuários Cadastrados
              </h3>

              <div className="filtros-bar">
                <div className="filtro-item filtro-item-busca">
                  <label className="input-label filtro-busca-label">
                    <Search size={14} /> Buscar
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Login, nome ou email..."
                    value={filtros.busca}
                    onChange={(e) =>
                      setFiltros({ ...filtros, busca: e.target.value })
                    }
                  />
                </div>
                <div className="filtro-item">
                  <label className="input-label">Nível de Acesso</label>
                  <select
                    className="input-field"
                    value={filtros.nivel}
                    onChange={(e) =>
                      setFiltros({ ...filtros, nivel: e.target.value })
                    }
                  >
                    <option value="">Todos</option>
                    <option value="1">Administradores</option>
                    <option value="2">Líderes</option>
                    <option value="3">Membros</option>
                  </select>
                </div>
                <div className="filtro-item">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={filtros.status}
                    onChange={(e) =>
                      setFiltros({ ...filtros, status: e.target.value })
                    }
                  >
                    <option value="todos">Todos</option>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                  </select>
                </div>
              </div>

              <div className="lauda-card usuarios-table-card">
                <div className="lauda-table-container">
                  <table className="lauda-table">
                    <thead>
                      <tr>
                        <th>Login / Nome</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map((u) => (
                        <tr
                          key={u.id}
                          className={
                            usuarioSelecionado?.id === u.id
                              ? "linha-selecionada"
                              : ""
                          }
                        >
                          <td data-label="Login / Nome">
                            <strong>@{u.username}</strong>
                            <br />
                            <span className="celula-nome-sub">
                              {u.first_name} {u.last_name}
                            </span>
                          </td>
                          <td data-label="Perfil">{renderBadgeNivel(u)}</td>
                          <td data-label="Status">
                            <span
                              className={`badge ${u.is_active ? "badge-primary" : "badge-gray"}`}
                            >
                              {u.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td data-label="Ação">
                            <button
                              className="lauda-btn lauda-btn-secondary btn-editar-tabela"
                              onClick={() => setUsuarioSelecionado(u)}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SEÇÃO 4: PAINEL LATERAL DE EDIÇÃO */}
            {usuarioSelecionado && (
              <section className="usuarios-editar-col lauda-card">
                <div className="usuarios-editar-header">
                  <h3 className="editar-titulo">
                    <Edit size={18} /> Editar Usuário
                  </h3>
                  <button
                    onClick={() => setUsuarioSelecionado(null)}
                    className="editar-fechar-btn"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSalvarEdicao} className="form-container">
                  <div className="form-col">
                    <label className="input-label">Nome Completo</label>
                    <input
                      type="text"
                      className="input-field"
                      value={usuarioSelecionado.first_name || ""}
                      onChange={(e) =>
                        setUsuarioSelecionado({
                          ...usuarioSelecionado,
                          first_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-col">
                    <label className="input-label">E-mail</label>
                    <input
                      type="email"
                      className="input-field"
                      value={usuarioSelecionado.email || ""}
                      onChange={(e) =>
                        setUsuarioSelecionado({
                          ...usuarioSelecionado,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-col">
                    <label className="input-label">Perfil de Acesso</label>
                    <select
                      className="input-field"
                      value={usuarioSelecionado.nivel_acesso}
                      onChange={(e) =>
                        setUsuarioSelecionado({
                          ...usuarioSelecionado,
                          nivel_acesso: parseInt(e.target.value),
                        })
                      }
                    >
                      <option value={1}>Administrador do Ministério</option>
                      <option value={2}>Líder de Louvor</option>
                      <option value={3}>Membro Padrão</option>
                    </select>
                    <span className="text-muted form-helper-text">
                      Alterar este nível atualiza também o acesso administrativo local do usuário.
                    </span>
                  </div>
                  <div className="user-access-summary">
                    <span className="input-label">Acesso atual</span>
                    {renderBadgeNivel(usuarioSelecionado)}
                  </div>

                  <div className="bloco-redefinir-senha">
                    <label className="input-label">
                      Redefinir Senha (Opcional)
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Deixe em branco para não alterar"
                      value={usuarioSelecionado.password || ""}
                      onChange={(e) =>
                        setUsuarioSelecionado({
                          ...usuarioSelecionado,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="checkbox-status-edicao">
                    <input
                      type="checkbox"
                      id="ativoEdit"
                      checked={usuarioSelecionado.is_active}
                      onChange={(e) =>
                        setUsuarioSelecionado({
                          ...usuarioSelecionado,
                          is_active: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="ativoEdit"
                      className={
                        usuarioSelecionado.is_active
                          ? "label-ativo"
                          : "label-inativo"
                      }
                    >
                      {usuarioSelecionado.is_active
                        ? "Conta Ativa"
                        : "Conta Inativa (Bloqueada)"}
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="lauda-btn lauda-btn-primary btn-salvar-edicao"
                  >
                    <Save size={16} /> Salvar Alterações
                  </button>
                </form>
              </section>
            )}
            </div>
          </section>

          {/* SEÇÃO 5: AUDITORIA */}
          <section className="lauda-card usuarios-secao">
            <h3 className="sec-header">
              <Activity size={18} /> Auditoria de Acessos Recentes
            </h3>
            <div className="lauda-table-container">
              <table className="lauda-table">
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Usuário / Perfil</th>
                    <th>Evento Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td data-label="Data e Hora" className="celula-data-hora">
                        {new Date(log.data_hora).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td data-label="Usuário / Perfil" className="celula-usuario-log">
                        {log.usuario_nome || "Sistema"}
                      </td>
                      <td data-label="Evento Registrado">{log.descricao || log.acao}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="3" className="tabela-vazia">
                        Nenhum evento recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
