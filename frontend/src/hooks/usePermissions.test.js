import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePermissions } from "./usePermissions";

function CapabilityProbe({ user, capability }) {
  const permissions = usePermissions(user);
  return createElement(
    "div",
    null,
    createElement(
      "span",
      null,
      permissions.hasCapability(capability) ? "allowed" : "blocked",
    ),
  );
}

describe("usePermissions", () => {
  it("uses explicit capability payload when present", () => {
    const permissions = usePermissions({
      capabilities: ["manage_music", "view_music_module"],
      authorization_roles: { ministry: "ministry_leader" },
    });

    expect(permissions.hasCapability("manage_music")).toBe(true);
    expect(permissions.canManageMusic).toBe(true);
    expect(permissions.canManageEscalas).toBe(false);
    expect(permissions.isLeader).toBe(true);
  });

  it("falls back to legacy flags while capabilities are absent", () => {
    const permissions = usePermissions({
      is_global_admin: true,
      is_superuser: false,
      ministerio_id: 7,
      nivel_acesso: 1,
    });

    expect(permissions.hasCapability("manage_platform")).toBe(true);
    expect(permissions.canEditMinistrySettings).toBe(true);
  });

  it("exposes dedicated operational flags for escalas and setlists", () => {
    const permissions = usePermissions({
      capabilities: ["manage_escalas", "manage_setlists"],
    });

    expect(permissions.canManageEscalas).toBe(true);
    expect(permissions.canManageSetlists).toBe(true);
    expect(permissions.canManageMusicModule).toBe(true);
  });

  it("shows and hides UI based on capability helper", () => {
    render(
      createElement(CapabilityProbe, {
        user: { capabilities: ["manage_members"] },
        capability: "manage_members",
      }),
    );

    expect(screen.getByText("allowed")).toBeInTheDocument();
  });
});
