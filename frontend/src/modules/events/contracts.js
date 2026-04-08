import { MODULE_KEY_EVENTS } from "../../lib/constants";

export const EVENTS_MODULE_CONTRACT = {
  key: MODULE_KEY_EVENTS,
  title: "Modulo Eventos",
  subtitle: "Agenda institucional e operacao de eventos",
  status: "planned",
  entryPath: null,
  navigationPriority: 20,
  plannedCapabilities: ["view_events_module", "manage_events"],
};

export function getEventsModuleNavItems() {
  return [];
}
