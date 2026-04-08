import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EscalaModal from "./EscalaModal";

const culto = { id: 1, nome: "Culto Teste" };
const membros = [
  { id: 10, first_name: "Ana", username: "ana", funcao_principal: "Voz" },
];
const escalas = [
  { id: 100, culto: 1, membro: 10, status_confirmacao: "PENDENTE" },
];

describe("EscalaModal", () => {
  it("hides management controls when the user cannot manage escalas", () => {
    render(
      <EscalaModal
        culto={culto}
        membros={membros}
        escalas={escalas}
        canManageEscalas={false}
        onClose={() => {}}
        onAddEscala={() => {}}
        onRemoveEscala={() => {}}
      />,
    );

    expect(screen.queryByText("Adicionar Membro na Equipe")).not.toBeInTheDocument();
    expect(screen.queryByText("Remover")).not.toBeInTheDocument();
  });

  it("shows management controls when the user can manage escalas", () => {
    render(
      <EscalaModal
        culto={culto}
        membros={membros}
        escalas={escalas}
        canManageEscalas={true}
        onClose={() => {}}
        onAddEscala={() => {}}
        onRemoveEscala={() => {}}
      />,
    );

    expect(screen.getByText("Adicionar Membro na Equipe")).toBeInTheDocument();
    expect(screen.getByText("Remover")).toBeInTheDocument();
  });
});
