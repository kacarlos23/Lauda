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

export const AUTH_SCOPE_PLATFORM = "platform";
export const AUTH_SCOPE_CHURCH = "church";
export const AUTH_SCOPE_MINISTRY = "ministry";
export const AUTH_SCOPE_MODULE = "module";

export const MODULE_KEY_MUSIC = "music";
export const MODULE_KEY_EVENTS = "events";

export const OFFICIAL_MODULE_KEYS = [MODULE_KEY_MUSIC, MODULE_KEY_EVENTS];

export const AUTHORIZATION_ROLES = [
  "platform_super_admin",
  "church_admin",
  "ministry_admin",
  "ministry_leader",
  "member",
];

export const AUTHORIZATION_CAPABILITIES = [
  "manage_platform",
  "manage_church",
  "manage_ministry",
  "view_members",
  "manage_members",
  "view_music_module",
  "manage_music",
  "manage_cultos",
  "manage_escalas",
  "manage_setlists",
  "view_auditoria",
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
