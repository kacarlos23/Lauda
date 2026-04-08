import { describe, expect, it } from "vitest";

import { getMusicModuleNavItems, MUSIC_MODULE_CONTRACT } from "./contracts";

describe("music module contracts", () => {
  it("exposes the official music module key", () => {
    expect(MUSIC_MODULE_CONTRACT.key).toBe("music");
    expect(MUSIC_MODULE_CONTRACT.entryPath).toBe("/app");
    expect(MUSIC_MODULE_CONTRACT.status).toBe("stable");
  });

  it("exposes navigation owned by the music module", () => {
    const navItems = getMusicModuleNavItems();

    expect(navItems.map((item) => item.to)).toEqual([
      "/app/musicas",
      "/app/cultos",
      "/app/equipes",
    ]);
  });
});
