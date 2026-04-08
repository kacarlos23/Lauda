from copy import deepcopy

from api.constants import MODULE_KEY_EVENTS, MODULE_KEY_MUSIC


OFFICIAL_MODULE_CATALOG = {
    MODULE_KEY_MUSIC: {
        "key": MODULE_KEY_MUSIC,
        "nome": "Musica",
        "descricao": "Modulo oficial de musica e louvor do Lauda.",
        "status": "stable",
        "default_is_active": True,
        "entry_path": "/app",
        "planned_capabilities": [
            "view_music_module",
            "manage_music",
            "manage_cultos",
            "manage_escalas",
            "manage_setlists",
        ],
        "core_dependencies": [
            "igreja",
            "ministerio",
            "memberships",
            "sessao",
            "capabilities",
            "modulos_ativos",
            "navegacao",
            "auditoria",
            "componentes_compartilhados",
            "servicos_base_api",
        ],
        "module_specific_scope": [
            "musicas",
            "cultos",
            "escalas",
            "setlists",
            "classificacoes_musicais",
        ],
    },
    MODULE_KEY_EVENTS: {
        "key": MODULE_KEY_EVENTS,
        "nome": "Eventos",
        "descricao": "Proximo modulo prioritario para agenda institucional e eventos da igreja.",
        "status": "planned",
        "default_is_active": False,
        "entry_path": None,
        "planned_capabilities": [
            "view_events_module",
            "manage_events",
        ],
        "core_dependencies": [
            "igreja",
            "ministerio",
            "memberships",
            "sessao",
            "capabilities",
            "modulos_ativos",
            "navegacao",
            "auditoria",
            "componentes_compartilhados",
            "servicos_base_api",
        ],
        "module_specific_scope": [
            "tipos_de_evento",
            "inscricoes",
            "equipes_de_apoio",
            "comunicacao_do_evento",
            "checklists_operacionais",
        ],
        "objective": {
            "summary": "Expandir a agenda base para um modulo institucional de eventos sem duplicar regras do core.",
            "who_uses": [
                "administracao_da_igreja",
                "liderancas_de_ministerio",
                "equipes_operacionais",
            ],
            "main_actions": [
                "planejar_eventos",
                "publicar_agenda",
                "acompanhar_execucao",
                "registrar_fluxos_operacionais",
            ],
            "domain_data": [
                "tipo_evento",
                "publico_alvo",
                "status_operacional",
                "checklists",
                "inscricoes",
            ],
            "core_data": [
                "igreja",
                "ministerio",
                "evento_base",
                "sessao",
                "capabilities",
                "modulos_ativos",
                "auditoria",
            ],
        },
    },
}

NEXT_PRIORITY_MODULE_KEY = MODULE_KEY_EVENTS

MODULE_CREATION_CHECKLIST = [
    "registrar_modulo_no_catalogo",
    "habilitar_modulo_por_igreja",
    "definir_capabilities_do_modulo",
    "criar_rotas_backend_e_frontend",
    "criar_telas_do_modulo",
    "conectar_ao_core_institucional",
    "validar_navegacao",
    "validar_permissoes",
    "validar_auditoria",
    "executar_testes_e_build",
]

MODULE_STRUCTURE_TEMPLATE = {
    "backend": [
        "models_do_modulo_ou_reuso_de_entidades_core",
        "serializers_dedicados",
        "viewsets_com_permission_classes",
        "servicos_do_dominio_em_api.services",
        "rotas_registradas_em_api.urls",
    ],
    "frontend": [
        "contracts_do_modulo_em_frontend/src/modules/<module>/contracts.js",
        "paginas_em_frontend/src/pages_ou_modules",
        "itens_de_navegacao_via_registry_modular",
        "guards_por_capability_e_modulo",
    ],
    "permissions": [
        "capabilities_dedicadas_se_realmente_necessarias",
        "mapeamento_no_resolvedor_de_autorizacao",
        "fallback_legacy_apenas_se_estritamente_necessario",
    ],
    "integration": [
        "modulo_no_catalogo_oficial",
        "habilitacao_por_igreja",
        "payload_de_sessao_sem_quebrar_musica",
        "logs_de_auditoria_por_escopo",
    ],
    "tests": [
        "testes_de_servico_e_permission_backend",
        "testes_de_rotas_criticas",
        "testes_do_registry_frontend",
        "build_frontend_e_regressao_do_modulo_estavel",
    ],
}


def get_official_module_catalog():
    return [deepcopy(item) for item in OFFICIAL_MODULE_CATALOG.values()]


def get_module_catalog_entry(module_key):
    definition = OFFICIAL_MODULE_CATALOG.get(module_key)
    if definition is None:
        return None
    return deepcopy(definition)


def get_next_priority_module_definition():
    return get_module_catalog_entry(NEXT_PRIORITY_MODULE_KEY)


def get_module_creation_checklist():
    return list(MODULE_CREATION_CHECKLIST)


def get_module_structure_template():
    return deepcopy(MODULE_STRUCTURE_TEMPLATE)


def build_module_expansion_blueprint():
    next_module = get_next_priority_module_definition()
    return {
        "next_priority_module": next_module,
        "official_catalog": get_official_module_catalog(),
        "creation_checklist": get_module_creation_checklist(),
        "structure_template": get_module_structure_template(),
        "guardrails": {
            "preserve_music_module": True,
            "single_frontier_only": True,
            "reuse_core_before_new_domain_logic": True,
            "do_not_create_multiple_modules_in_parallel": True,
        },
    }
