import { describe, expect, it } from "vitest";

import {
  canAccessReactAdmin,
  resolveAuthorizedAppEntry,
  resolveMemberDestination,
} from "./access";

describe("core auth access helpers", () => {
  it("keeps react admin restricted to superuser", () => {
    expect(canAccessReactAdmin({ is_superuser: true })).toBe(true);
    expect(canAccessReactAdmin({ is_superuser: false })).toBe(false);
  });

  it("resolves member destination without depending on music pages", () => {
    expect(resolveMemberDestination(null, "?code=ABC123")).toBe("/login?code=ABC123");
    expect(
      resolveMemberDestination({
        user: {
          ministerio_id: 77,
          is_superuser: false,
          active_modules: ["music"],
        },
      }),
    ).toBe("/app");
  });

  it("resolves a valid institutional entry when no module is active", () => {
    expect(
      resolveAuthorizedAppEntry({
        ministerio_id: 77,
        active_modules: [],
        capabilities: ["manage_members"],
      }),
    ).toBe("/app/membros");

    expect(
      resolveAuthorizedAppEntry({
        ministerio_id: 77,
        active_modules: [],
        capabilities: [],
      }),
    ).toBe("/app/perfil");
  });

  it("ignores planned modules without navigation until they are implemented", () => {
    expect(
      resolveAuthorizedAppEntry({
        ministerio_id: 77,
        active_modules: ["events"],
        capabilities: ["manage_members"],
      }),
    ).toBe("/app/membros");
  });
});
