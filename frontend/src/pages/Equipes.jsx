import { Users } from "lucide-react";
import "./Placeholders.css";

export default function Equipes() {
  return (
    <div className="placeholder-page">
      <div className="lauda-page-header">
        <div className="page-title-group">
          <h2 className="text-primary">
            <Users size={28} /> Equipes
          </h2>
          <p className="text-muted">
            Estrutura inicial pronta. O CRUD de equipes sera conectado na proxima etapa.
          </p>
        </div>
      </div>

      <section className="lauda-card placeholder-card">
        <h3>Placeholder de navegacao</h3>
        <p className="text-muted">
          Esta rota foi criada para preparar o cadastro e a gestao de equipes por ministerio.
        </p>
      </section>
    </div>
  );
}
