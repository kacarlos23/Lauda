import { useState } from "react";

export default function EscalaModal({
  culto,
  membros,
  escalas,
  canManageEscalas,
  onClose,
  onAddEscala,
  onRemoveEscala,
}) {
  const [novoMembroId, setNovoMembroId] = useState("");

  // Cálculos movidos do Cultos.jsx para cá (só executam quando o modal está aberto)
  const escalasDoCulto = culto
    ? escalas.filter((escala) => escala.culto === culto.id)
    : [];

  const membrosDisponiveis = membros.filter(
    (membro) => !escalasDoCulto.some((escala) => escala.membro === membro.id),
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (novoMembroId) {
      onAddEscala(novoMembroId);
      setNovoMembroId(""); // Limpa o select após disparar a ação
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Escala: {culto.nome}</h3>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body form-container">
          {canManageEscalas && (
            <form onSubmit={handleSubmit} className="escala-toolbar">
              <div className="form-group escala-toolbar-select">
                <label className="input-label">
                  Adicionar Membro na Equipe
                </label>
                <select
                  value={novoMembroId}
                  onChange={(e) => setNovoMembroId(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">Selecione um membro para escalar...</option>
                  {membrosDisponiveis.map((membro) => (
                    <option key={membro.id} value={membro.id}>
                      {membro.first_name || membro.username} -{" "}
                      {membro.funcao_principal}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="lauda-btn lauda-btn-primary"
                style={{ height: "42px" }}
              >
                Adicionar
              </button>
            </form>
          )}

          <div className="lauda-table-container">
            <table className="lauda-table">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Função</th>
                  <th>Status</th>
                  {canManageEscalas && <th>Ação</th>}
                </tr>
              </thead>
              <tbody>
                {escalasDoCulto.map((escala) => {
                  const membro = membros.find(
                    (item) => item.id === escala.membro,
                  );
                  return (
                    <tr key={escala.id}>
                      <td data-label="Membro" className="table-cell-muted">
                        {membro
                          ? membro.first_name || membro.username
                          : "Carregando..."}
                      </td>
                      <td data-label="Função">
                        {membro ? membro.funcao_principal : "-"}
                      </td>
                      <td data-label="Status">
                        <span
                          className={`badge ${escala.status_confirmacao === "CONFIRMADO" ? "badge-primary" : "badge-gray"}`}
                        >
                          {escala.status_confirmacao}
                        </span>
                      </td>
                      {canManageEscalas && (
                        <td data-label="Ação">
                          <button
                            onClick={() => onRemoveEscala(escala.id)}
                            className="lauda-btn lauda-btn-secondary culto-remove-btn"
                          >
                            Remover
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {escalasDoCulto.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageEscalas ? 4 : 3}
                      className="table-empty"
                    >
                      Nenhum membro escalado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
