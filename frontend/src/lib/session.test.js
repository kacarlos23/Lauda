import { describe, expect, it } from "vitest";
import { normalizeSession } from "./session";

describe("session normalization", () => {
  it("preserves capability payload fields with safe defaults", () => {
    const session = normalizeSession({
      access: "token",
      user: {
        username: "tester",
        capabilities: ["manage_music", "manage_music", "view_music_module"],
        active_modules: ["music", "music"],
      },
    });

    expect(session.user.capabilities).toEqual([
      "manage_music",
      "view_music_module",
    ]);
    expect(session.user.authorization_roles).toEqual({});
    expect(session.user.is_superuser).toBe(false);
    expect(session.user.active_modules).toEqual(["music"]);
  });
});
