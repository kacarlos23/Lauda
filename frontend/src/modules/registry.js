import { EVENTS_MODULE_CONTRACT, getEventsModuleNavItems } from "./events/contracts";
import { MUSIC_MODULE_CONTRACT, getMusicModuleNavItems } from "./music/contracts";

const MODULE_REGISTRY = {
  [MUSIC_MODULE_CONTRACT.key]: {
    ...MUSIC_MODULE_CONTRACT,
    getNavItems: getMusicModuleNavItems,
  },
  [EVENTS_MODULE_CONTRACT.key]: {
    ...EVENTS_MODULE_CONTRACT,
    getNavItems: getEventsModuleNavItems,
  },
};

function getOrderedContracts(activeModules = []) {
  return [...new Set(activeModules)]
    .map((moduleKey) => MODULE_REGISTRY[moduleKey])
    .filter(Boolean)
    .sort(
      (left, right) =>
        (left.navigationPriority || Number.MAX_SAFE_INTEGER) -
        (right.navigationPriority || Number.MAX_SAFE_INTEGER),
    );
}

export function listOfficialModuleContracts() {
  return Object.values(MODULE_REGISTRY).sort(
    (left, right) =>
      (left.navigationPriority || Number.MAX_SAFE_INTEGER) -
      (right.navigationPriority || Number.MAX_SAFE_INTEGER),
  );
}

export function getModuleContract(moduleKey) {
  return MODULE_REGISTRY[moduleKey] || null;
}

export function resolveModuleEntry(activeModules = []) {
  return (
    getOrderedContracts(activeModules).find((module) => module.entryPath)
      ?.entryPath || null
  );
}

export function buildModuleNavigation(activeModules = []) {
  return getOrderedContracts(activeModules).flatMap((module) =>
    typeof module.getNavItems === "function" ? module.getNavItems() : [],
  );
}
