import { Calendar, FolderKanban, Music2 } from "lucide-react";

import { MODULE_KEY_MUSIC } from "../../lib/constants";

export const MUSIC_MODULE_CONTRACT = {
  key: MODULE_KEY_MUSIC,
  title: "Modulo Musica",
  subtitle: "Fluxo musical do ministerio",
  status: "stable",
  entryPath: "/app",
  navigationPriority: 10,
};

export function getMusicModuleNavItems() {
  return [
    { to: "/app/musicas", label: "Musicas", icon: Music2 },
    { to: "/app/cultos", label: "Cultos", icon: Calendar },
    { to: "/app/equipes", label: "Equipes", icon: FolderKanban },
  ];
}
