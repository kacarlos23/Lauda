import { useEffect, useId, useMemo, useState } from "react";
import {
  AudioLines,
  AudioWaveform,
  Check,
  ChevronDown,
  Disc3,
  Drum,
  Guitar,
  HandHelping,
  Image,
  KeyboardMusic,
  Mic2,
  MicVocal,
  MonitorSpeaker,
  Music4,
  Piano,
  Presentation,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import "./MultiSelectField.css";

const DEFAULT_HELP_TEXT =
  "Selecione uma ou mais funcoes no modal. A selecao pode ser atualizada a qualquer momento.";

const FALLBACK_ICON = Music4;

const FUNCTION_ICON_MAP = {
  "Back Vocal": Mic2,
  Backstage: Users,
  Baixo: Disc3,
  Bateria: Drum,
  "Comunicacao de Imagem": Image,
  Flauta: AudioLines,
  Guitarra: Guitar,
  "Mesa de Som": SlidersHorizontal,
  Ministro: HandHelping,
  Multimidia: MonitorSpeaker,
  Piano,
  Pregador: Presentation,
  Saxofone: AudioWaveform,
  Teclado: KeyboardMusic,
  Violao: Guitar,
  Violino: Music4,
  Vocalista: MicVocal,
};

function FunctionOptionRow({ option, selected, onToggle }) {
  const Icon = FUNCTION_ICON_MAP[option] || FALLBACK_ICON;

  return (
    <button
      type="button"
      className={`multi-select-option${selected ? " is-selected" : ""}`}
      role="option"
      aria-selected={selected}
      aria-pressed={selected}
      onClick={() => onToggle(option)}
    >
      <span className="multi-select-option-main">
        <span className="multi-select-option-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <span className="multi-select-option-label">{option}</span>
      </span>
      <span className="multi-select-option-check" aria-hidden="true">
        {selected ? <Check size={16} /> : null}
      </span>
    </button>
  );
}

export default function MultiSelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  description = "",
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(() => (Array.isArray(value) ? value : []));

  const selectedValue = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const selectedLabels = useMemo(
    () => (Array.isArray(draftValue) ? draftValue : []),
    [draftValue],
  );

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const selectedSummary = selectedValue.length
    ? `${selectedValue.length} funcao${selectedValue.length > 1 ? "oes" : ""} selecionada${selectedValue.length > 1 ? "s" : ""}`
    : "Nenhuma funcao selecionada";

  const selectedPreview = selectedValue.length
    ? selectedValue.join(", ")
    : "Abra o modal para escolher as funcoes.";

  const modalHelpText = description || DEFAULT_HELP_TEXT;

  const handleOpenModal = () => {
    if (disabled) {
      return;
    }

    setDraftValue(selectedValue);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleToggleOption = (option) => {
    setDraftValue((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  const handleApplySelection = () => {
    onChange(draftValue);
    setIsModalOpen(false);
  };

  const handleClearSelection = () => {
    setDraftValue([]);
  };

  return (
    <div className="multi-select-field">
      <label className="input-label" htmlFor={fieldId}>
        {label}
      </label>

      <button
        id={fieldId}
        type="button"
        className={`input-field multi-select-trigger${isModalOpen ? " is-open" : ""}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-controls={`${fieldId}-dialog`}
        disabled={disabled}
        onClick={handleOpenModal}
      >
        <span className="multi-select-trigger-copy">
          <span className="multi-select-trigger-title">{selectedSummary}</span>
          <span className="multi-select-trigger-subtitle">{selectedPreview}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      <p className="text-muted multi-select-help">{modalHelpText}</p>

      {selectedValue.length > 0 && (
        <div className="multi-select-tags" role="list" aria-label={`${label} selecionadas`}>
          {selectedValue.map((item) => (
            <span key={item} className="multi-select-tag" role="listitem">
              {item}
            </span>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            id={`${fieldId}-dialog`}
            className="modal modal-compact multi-select-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldId}-title`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <div>
                  <h3 id={`${fieldId}-title`}>{label}</h3>
                  <p className="text-muted">{modalHelpText}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseModal}
                aria-label="Fechar selecao de funcoes"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="multi-select-selectbox-shell">
                <div className="multi-select-selectbox-header">
                  <span className="multi-select-selectbox-label">Funcoes disponiveis</span>
                  <span className="multi-select-selectbox-count">
                    {selectedLabels.length} selecionada{selectedLabels.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div
                  className="multi-select-selectbox"
                  role="listbox"
                  aria-label={label}
                  aria-multiselectable="true"
                >
                  {options.map((option) => (
                    <FunctionOptionRow
                      key={option}
                      option={option}
                      selected={selectedLabels.includes(option)}
                      onToggle={handleToggleOption}
                    />
                  ))}
                </div>
              </div>

              <div className="multi-select-current-selection">
                <span className="multi-select-current-label">Selecao atual</span>
                {selectedLabels.length > 0 ? (
                  <div className="multi-select-tags" role="list" aria-label={`${label} em edicao`}>
                    {selectedLabels.map((item) => (
                      <span key={item} className="multi-select-tag" role="listitem">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted multi-select-empty">Nenhuma funcao escolhida.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary"
                onClick={handleClearSelection}
              >
                Limpar
              </button>
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary multi-select-cancel-btn"
                onClick={handleCloseModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="lauda-btn lauda-btn-primary"
                onClick={handleApplySelection}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
