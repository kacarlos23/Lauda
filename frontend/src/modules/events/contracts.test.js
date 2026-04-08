import { describe, expect, it } from "vitest";

import { EVENTS_MODULE_CONTRACT, getEventsModuleNavItems } from "./contracts";

describe("events module contracts", () => {
  it("keeps the next module registered as planned", () => {
    expect(EVENTS_MODULE_CONTRACT.key).toBe("events");
    expect(EVENTS_MODULE_CONTRACT.status).toBe("planned");
    expect(EVENTS_MODULE_CONTRACT.entryPath).toBeNull();
  });

  it("does not expose navigation before the module exists", () => {
    expect(getEventsModuleNavItems()).toEqual([]);
  });
});
