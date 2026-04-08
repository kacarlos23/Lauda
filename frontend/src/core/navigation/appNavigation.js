import {
  Building2,
  Home,
  Music2,
  Shield,
  User,
  Users,
} from "lucide-react";

import { MODULE_KEY_MUSIC } from "../../lib/constants";
import { buildModuleNavigation } from "../../modules/registry";

export function buildMemberNavigation({
  activeModules,
  permissions,
  hasModule,
  hasReactAdminAccess,
}) {
  const sections = [
    {
      id: "institutional",
      title: "Institucional",
      items: [
        { to: "/app", label: "Dashboard", icon: Home, end: true },
        { to: "/app/perfil", label: "Meu Perfil", icon: User },
      ],
    },
  ];

  const operationalItems = [];
  if (permissions.canViewMinistrySettings) {
    operationalItems.push({
      to: "/app/ministerio/configuracoes",
      label: "Ministerio",
      icon: Building2,
    });
  }
  if (permissions.canManageMembers) {
    operationalItems.push({
      to: "/app/membros",
      label: "Membros",
      icon: Users,
    });
  }
  if (permissions.canViewAuditoria) {
    operationalItems.push({
      to: "/app/auditoria",
      label: "Auditoria",
      icon: Shield,
    });
  }
  if (operationalItems.length > 0) {
    sections.push({
      id: "operational",
      title: "Operacional",
      items: operationalItems,
    });
  }

  const moduleItems = buildModuleNavigation(activeModules);
  if (hasModule(MODULE_KEY_MUSIC) && permissions.canEditMinistrySettings) {
    moduleItems.push({
      to: "/app/ministerio/classificacoes",
      label: "Classificacoes",
      icon: Music2,
    });
  }
  if (moduleItems.length > 0) {
    sections.push({
      id: "modules",
      title: "Modulos Ativos",
      items: moduleItems,
    });
  }

  if (hasReactAdminAccess) {
    sections.push({
      id: "platform",
      title: "Plataforma",
      items: [{ to: "/admin", label: "Painel Global", icon: Shield }],
    });
  }

  return sections;
}

export function buildAdminNavigation() {
  return [
    {
      id: "platform",
      title: "Plataforma",
      items: [
        { to: "/admin", label: "Dashboard", icon: Home, end: true },
        { to: "/admin/membros", label: "Usuarios", icon: Users },
        { to: "/admin/auditoria", label: "Auditoria", icon: Shield },
        { to: "/admin/perfil", label: "Meu Perfil", icon: User },
      ],
    },
  ];
}
