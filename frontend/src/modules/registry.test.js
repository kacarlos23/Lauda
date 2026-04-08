import { describe, expect, it } from "vitest";

import {
  buildModuleNavigation,
  getModuleContract,
  listOfficialModuleContracts,
  resolveModuleEntry,
} from "./registry";

describe("module registry", () => {
  it("lists the official modules in stable-to-planned order", () => {
    expect(listOfficialModuleContracts().map((module) => module.key)).toEqual([
      "music",
      "events",
    ]);
  });

  it("resolves an entry only for modules that already own navigation", () => {
    expect(resolveModuleEntry(["events"])).toBeNull();
    expect(resolveModuleEntry(["music", "events"])).toBe("/app");
  });

  it("builds navigation only for active modules with registered items", () => {
    expect(buildModuleNavigation(["events"])).toEqual([]);
    expect(buildModuleNavigation(["music"]).map((item) => item.to)).toEqual([
      "/app/musicas",
      "/app/cultos",
      "/app/equipes",
    ]);
  });

  it("exposes planned module metadata without leaking routes", () => {
    expect(getModuleContract("events")).toMatchObject({
      key: "events",
      status: "planned",
      entryPath: null,
    });
  });
});
