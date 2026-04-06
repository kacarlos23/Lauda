import { Music2 } from "lucide-react";
import { MUSIC_CLASSIFICATION_OPTIONS } from "../lib/constants";
import "./Placeholders.css";

export default function ClassificacoesMusicais() {
  return (
    <div className="placeholder-page">
      <div className="lauda-page-header">
        <div className="page-title-group">
          <h2 className="text-primary">
            <Music2 size={28} /> Classificacao de Musicas
          </h2>
          <p className="text-muted">
            Base configurada para o gerenciamento das classificacoes globais do catalogo.
          </p>
        </div>
      </div>

      <section className="lauda-card placeholder-card">
        <h3>Valores disponiveis</h3>
        <div className="classification-grid">
          {MUSIC_CLASSIFICATION_OPTIONS.map((item) => (
            <article key={item.value} className="classification-card">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
