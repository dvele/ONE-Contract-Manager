import { describe, it, expect, vi } from "vitest";

// contractGenerator imports the DB pool, which throws without DATABASE_URL.
vi.mock("../../db", () => ({ pool: {} }));

const { isUnnumberedMasterEfSlug } = await import("../contractGenerator");

describe("isUnnumberedMasterEfSlug", () => {
  it("keeps the old preamble and recital slugs unnumbered", () => {
    for (const slug of [
      "MASTER_EF_PREAMBLE",
      "MASTER_EF_RECITALS",
      "MASTER_EF_RECITAL_1",
      "MASTER_EF_RECITAL_3",
      "MASTER_EF_RECITAL_THEREFORE",
    ]) {
      expect(isUnnumberedMasterEfSlug(slug), slug).toBe(true);
    }
  });

  it("still numbers an ordinary old section", () => {
    expect(isUnnumberedMasterEfSlug("MASTER_EF_AGREEMENT_CONSTRUCTION")).toBe(false);
    expect(isUnnumberedMasterEfSlug("FEES_PAYMENT_SECTION")).toBe(false);
  });

  it("treats the four MEF26 forms as unnumbered", () => {
    for (const slug of [
      "MEF26_PREAMBLE",
      "MEF26_RECITALS",
      "MEF26_RECITAL_1",
      "MEF26_RECITAL_THEREFORE",
    ]) {
      expect(isUnnumberedMasterEfSlug(slug), slug).toBe(true);
    }
  });

  it("numbers an MEF26 section", () => {
    expect(isUnnumberedMasterEfSlug("MEF26_1_AGREEMENT_CONSTRUCTION")).toBe(false);
  });
});
