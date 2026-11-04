import { describe, expect, it } from "vitest";
import { withContractorEntityDefaults } from "../contractorEntityDefaults";

const ENTITY = {
  licenseNumber: "ROC-654321",
  licenseState: "AZ",
  contactName: "Morgan Hale",
  contactEmail: "morgan@example.com",
  entityType: "LLC",
  address: "1 Entity Way",
  insuranceCarrier: "Liberty Mutual",
  insurancePhone: "800-555-0100",
};

describe("withContractorEntityDefaults", () => {
  it("copies the license and contact the wizard never sends", () => {
    const result = withContractorEntityDefaults(
      { contractorType: "onsite_general", legalName: "Dvele Construction AZ, LLC", address: "" },
      ENTITY
    );
    expect(result).toMatchObject({
      legalName: "Dvele Construction AZ, LLC",
      licenseNumber: "ROC-654321",
      licenseState: "AZ",
      contactName: "Morgan Hale",
      contactEmail: "morgan@example.com",
      entityType: "LLC",
      // The wizard sends "" when no address was typed; the entity's fills it.
      address: "1 Entity Way",
      // Exhibit F's California insurance notice prints these.
      insuranceCarrier: "Liberty Mutual",
      insurancePhone: "800-555-0100",
    });
  });

  it("never overwrites a value the request carries", () => {
    const result = withContractorEntityDefaults(
      { legalName: "X", licenseNumber: "TYPED-1", address: "Typed St" },
      ENTITY
    );
    expect(result.licenseNumber).toBe("TYPED-1");
    expect(result.address).toBe("Typed St");
  });

  it("leaves the fields alone without an entity, and skips empty entity values", () => {
    const fields = { legalName: "X" };
    expect(withContractorEntityDefaults(fields, null)).toEqual(fields);
    expect(withContractorEntityDefaults({ legalName: "X" }, { licenseNumber: "", contactName: null })).toEqual({
      legalName: "X",
    });
  });

  it("only copies contractor columns, never identity or ownership fields", () => {
    const result = withContractorEntityDefaults({ legalName: "X" }, {
      ...ENTITY,
      id: 99,
      organizationId: 1,
      legalName: "Entity Name",
      contractorType: "onsite",
    } as any);
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("organizationId");
    expect(result.legalName).toBe("X");
    expect(result).not.toHaveProperty("contractorType");
  });
});
