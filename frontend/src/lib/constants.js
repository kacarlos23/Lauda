export const USER_FUNCTION_OPTIONS = [
  "Back Vocal",
  "Backstage",
  "Baixo",
  "Bateria",
  "Comunicacao de Imagem",
  "Flauta",
  "Guitarra",
  "Mesa de Som",
  "Ministro",
  "Multimidia",
  "Piano",
  "Pregador",
  "Saxofone",
  "Teclado",
  "Violao",
  "Violino",
  "Vocalista",
];

export const MUSIC_CLASSIFICATION_OPTIONS = [
  {
    label: "Louvor",
    value: "louvor",
    description: "Elogio e agradecimento pelo que Deus fez, faz ou fara.",
  },
  {
    label: "Adoracao",
    value: "adoracao",
    description: "Reconhecimento a Deus por quem Ele e.",
  },
  {
    label: "Contemplacao",
    value: "contemplacao",
    description: "Foco na meditacao da Pessoa de Deus, em Seu carater e natureza.",
  },
  {
    label: "Consagracao",
    value: "consagracao",
    description: "Dedicacao da vida a Deus e santificacao.",
  },
  {
    label: "Alegria (Jubilo)",
    value: "alegria",
    description: "Expressao de alegria pelo Senhor e por Seus feitos.",
  },
  {
    label: "Especiais",
    value: "especiais",
    description: "Temas especificos como casamento, batizado e outras celebracoes.",
  },
];

export const MUSIC_CLASSIFICATION_MAP = Object.fromEntries(
  MUSIC_CLASSIFICATION_OPTIONS.map((item) => [item.value, item]),
);
