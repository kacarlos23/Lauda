export const USER_FUNCTION_OPTIONS = [
  "Back Vocal",
  "Backstage",
  "Baixo",
  "Bateria",
  "Comunicação de Imagem",
  "Flauta",
  "Guitarra",
  "Mesa de Som",
  "Ministro",
  "Multimídia",
  "Piano",
  "Pregador",
  "Saxofone",
  "Teclado",
  "Violão",
  "Violino",
  "Vocalista",
];

export const MUSIC_CLASSIFICATION_OPTIONS = [
  {
    label: "Louvor",
    value: "louvor",
    description: "Elogio e agradecimento pelo que Deus fez, faz ou fará.",
  },
  {
    label: "Adoração",
    value: "adoracao",
    description: "Reconhecimento a Deus por quem Ele é.",
  },
  {
    label: "Contemplação",
    value: "contemplacao",
    description:
      "Foco na meditação da Pessoa de Deus, em Seu caráter e natureza.",
  },
  {
    label: "Consagração",
    value: "consagracao",
    description: "Dedicação da vida a Deus e santificação.",
  },
  {
    label: "Alegria (Júbilo)",
    value: "alegria",
    description: "Expressão de alegria pelo Senhor e por Seus feitos.",
  },
  {
    label: "Especiais",
    value: "especiais",
    description:
      "Temas específicos como casamento, batizado e outras celebrações.",
  },
];

export const MUSIC_CLASSIFICATION_MAP = Object.fromEntries(
  MUSIC_CLASSIFICATION_OPTIONS.map((item) => [item.value, item]),
);
