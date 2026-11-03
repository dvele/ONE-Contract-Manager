import { describe, expect, it } from "vitest";
import { mapProjectToVariables, type ProjectWithRelations } from "../mapper";

/** Guards the old exhibits: SIGNATURE_BLOCK_TABLE must not change. */
describe("SIGNATURE_BLOCK_TABLE", () => {
  it("is unchanged for a fixture project", () => {
    const data = {
      project: { projectNumber: "P", name: "N", status: "draft", onSiteSelection: "CRC", createdAt: null },
      client: { legalName: "Example Holdings, LLC" },
      childLlc: { legalName: "Dvele AZ, LLC", formationState: "AZ", entityType: "LLC" },
      projectDetails: null,
      financials: null,
      milestones: [],
      warrantyTerms: null,
      contractors: [],
    } as unknown as ProjectWithRelations;
    expect(mapProjectToVariables(data).SIGNATURE_BLOCK_TABLE).toMatchSnapshot();
  });
});
