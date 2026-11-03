import { describe, expect, it } from "vitest";
import { activeTemplateId, NoActiveTemplateError } from "../templateLookup";

describe("activeTemplateId (Ruling 32)", () => {
  const templates = [
    { id: 24, contract_type: "ONE" },
    { id: 28, contract_type: "MASTER_EF" },
  ];

  it("finds the active template for a contract type, in any case", () => {
    expect(activeTemplateId(templates, "master_ef")).toBe(28);
    expect(activeTemplateId(templates, "MASTER_EF")).toBe(28);
    expect(activeTemplateId(templates, "ONE")).toBe(24);
  });

  it("falls back to the active MASTER_EF template for another type, as before", () => {
    expect(activeTemplateId(templates, "MANUFACTURING")).toBe(28);
  });

  it("throws, rather than guessing a template id, when none is active", () => {
    expect(() => activeTemplateId([], "master_ef")).toThrow(NoActiveTemplateError);
    expect(() => activeTemplateId([{ id: 24, contract_type: "ONE" }], "master_ef")).toThrow(/No active contract template/);
  });

  it("never returns the old hard-coded id", () => {
    expect(() => activeTemplateId([{ contract_type: "MASTER_EF" }], "master_ef")).toThrow(NoActiveTemplateError);
  });
});
