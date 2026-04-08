USER_FUNCTION_OPTIONS = [
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
]

USER_FUNCTION_CHOICES = [(value, value) for value in USER_FUNCTION_OPTIONS]
USER_FUNCTION_SET = set(USER_FUNCTION_OPTIONS)

AUTH_SCOPE_PLATFORM = "platform"
AUTH_SCOPE_CHURCH = "church"
AUTH_SCOPE_MINISTRY = "ministry"
AUTH_SCOPE_MODULE = "module"

AUTH_SCOPES = [
    AUTH_SCOPE_PLATFORM,
    AUTH_SCOPE_CHURCH,
    AUTH_SCOPE_MINISTRY,
    AUTH_SCOPE_MODULE,
]

MODULE_KEY_MUSIC = "music"
MODULE_KEY_EVENTS = "events"

OFFICIAL_MODULE_KEYS = [
    MODULE_KEY_MUSIC,
    MODULE_KEY_EVENTS,
]

ROLE_PLATFORM_SUPER_ADMIN = "platform_super_admin"
ROLE_CHURCH_ADMIN = "church_admin"
ROLE_MINISTRY_ADMIN = "ministry_admin"
ROLE_MINISTRY_LEADER = "ministry_leader"
ROLE_MEMBER = "member"

AUTHORIZATION_ROLES = [
    ROLE_PLATFORM_SUPER_ADMIN,
    ROLE_CHURCH_ADMIN,
    ROLE_MINISTRY_ADMIN,
    ROLE_MINISTRY_LEADER,
    ROLE_MEMBER,
]

CAPABILITY_MANAGE_PLATFORM = "manage_platform"
CAPABILITY_MANAGE_CHURCH = "manage_church"
CAPABILITY_MANAGE_MINISTRY = "manage_ministry"
CAPABILITY_VIEW_MEMBERS = "view_members"
CAPABILITY_MANAGE_MEMBERS = "manage_members"
CAPABILITY_VIEW_MUSIC_MODULE = "view_music_module"
CAPABILITY_MANAGE_MUSIC = "manage_music"
CAPABILITY_MANAGE_CULTOS = "manage_cultos"
CAPABILITY_MANAGE_ESCALAS = "manage_escalas"
CAPABILITY_MANAGE_SETLISTS = "manage_setlists"
CAPABILITY_VIEW_AUDITORIA = "view_auditoria"

AUTHORIZATION_CAPABILITIES = [
    CAPABILITY_MANAGE_PLATFORM,
    CAPABILITY_MANAGE_CHURCH,
    CAPABILITY_MANAGE_MINISTRY,
    CAPABILITY_VIEW_MEMBERS,
    CAPABILITY_MANAGE_MEMBERS,
    CAPABILITY_VIEW_MUSIC_MODULE,
    CAPABILITY_MANAGE_MUSIC,
    CAPABILITY_MANAGE_CULTOS,
    CAPABILITY_MANAGE_ESCALAS,
    CAPABILITY_MANAGE_SETLISTS,
    CAPABILITY_VIEW_AUDITORIA,
]

ROLE_CAPABILITY_MATRIX = {
    ROLE_PLATFORM_SUPER_ADMIN: {
        AUTH_SCOPE_PLATFORM: AUTHORIZATION_CAPABILITIES,
        AUTH_SCOPE_CHURCH: [
            CAPABILITY_MANAGE_CHURCH,
            CAPABILITY_MANAGE_MINISTRY,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
        AUTH_SCOPE_MINISTRY: [
            CAPABILITY_MANAGE_MINISTRY,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
        AUTH_SCOPE_MODULE: [
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
    },
    ROLE_CHURCH_ADMIN: {
        AUTH_SCOPE_CHURCH: [
            CAPABILITY_MANAGE_CHURCH,
            CAPABILITY_MANAGE_MINISTRY,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
        AUTH_SCOPE_MINISTRY: [
            CAPABILITY_MANAGE_MINISTRY,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
        AUTH_SCOPE_MODULE: [
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
    },
    ROLE_MINISTRY_ADMIN: {
        AUTH_SCOPE_MINISTRY: [
            CAPABILITY_MANAGE_MINISTRY,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
        AUTH_SCOPE_MODULE: [
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_MANAGE_MEMBERS,
            CAPABILITY_VIEW_AUDITORIA,
        ],
    },
    ROLE_MINISTRY_LEADER: {
        AUTH_SCOPE_MINISTRY: [
            CAPABILITY_VIEW_MEMBERS,
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
        ],
        AUTH_SCOPE_MODULE: [
            CAPABILITY_VIEW_MUSIC_MODULE,
            CAPABILITY_MANAGE_MUSIC,
            CAPABILITY_MANAGE_CULTOS,
            CAPABILITY_MANAGE_ESCALAS,
            CAPABILITY_MANAGE_SETLISTS,
        ],
    },
    ROLE_MEMBER: {
        AUTH_SCOPE_MINISTRY: [
            CAPABILITY_VIEW_MUSIC_MODULE,
        ],
        AUTH_SCOPE_MODULE: [
            CAPABILITY_VIEW_MUSIC_MODULE,
        ],
    },
}

MUSIC_CLASSIFICATION_OPTIONS = [
    {
        "label": "Louvor",
        "value": "louvor",
        "description": "Elogio e agradecimento pelo que Deus fez, faz ou fara.",
    },
    {
        "label": "Adoracao",
        "value": "adoracao",
        "description": "Reconhecimento a Deus por quem Ele e.",
    },
    {
        "label": "Contemplacao",
        "value": "contemplacao",
        "description": "Foco na meditacao da Pessoa de Deus, em Seu carater e natureza.",
    },
    {
        "label": "Consagracao",
        "value": "consagracao",
        "description": "Dedicacao da vida a Deus e santificacao.",
    },
    {
        "label": "Alegria (Jubilo)",
        "value": "alegria",
        "description": "Expressao de alegria pelo Senhor e por Seus feitos.",
    },
    {
        "label": "Especiais",
        "value": "especiais",
        "description": "Temas especificos, como casamento, batizado e celebracoes especiais.",
    },
]

MUSIC_CLASSIFICATION_CHOICES = [
    (item["value"], item["label"]) for item in MUSIC_CLASSIFICATION_OPTIONS
]
MUSIC_CLASSIFICATION_MAP = {
    item["value"]: item for item in MUSIC_CLASSIFICATION_OPTIONS
}
MUSIC_CLASSIFICATION_VALUES = [item["value"] for item in MUSIC_CLASSIFICATION_OPTIONS]
MUSIC_CLASSIFICATION_SET = set(MUSIC_CLASSIFICATION_VALUES)
