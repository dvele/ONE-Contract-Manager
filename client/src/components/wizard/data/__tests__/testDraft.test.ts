import { describe, expect, it } from "vitest";
import { createTestDraftProject, TEST_DRAFT_PROFILES, type RequestFn } from "../testDraft";

interface Call {
  method: string;
  url: string;
  data?: any;
}

/** A fake API: records every call and answers the handful of reads and creates the builder needs. */
function fakeApi(options: { homeModels?: unknown[]; llcs?: unknown[] } = {}) {
  const calls: Call[] = [];
  let phaseId = 200;
  let propertyNumber = 0;
  const request: RequestFn = async (method, url, data) => {
    calls.push({ method, url, data });
    const respond = (body: unknown) => new Response(JSON.stringify(body));
    if (url === "/api/home-models") return respond(options.homeModels ?? [{ id: 13, name: "Lumina" }]);
    if (url === "/api/llcs") return respond(options.llcs ?? [{ id: 7, name: "Dvele AZ, LLC" }]);
    if (url === "/api/projects") return respond({ id: 55 });
    if (url.endsWith("/phases")) return respond({ id: phaseId++ });
    if (url.endsWith("/properties")) {
      propertyNumber++;
      return respond({ id: 300 + propertyNumber, propertyCode: `P-${propertyNumber}` });
    }
    return respond({ id: 1 });
  };
  return { calls, request };
}

const NOW = new Date("2026-11-03T12:00:00Z");

describe("createTestDraftProject", () => {
  it.each(["FOB", "CRC", "CMOS"] as const)("saves a complete %s project and returns its id", async (model) => {
    const { calls, request } = fakeApi();
    const id = await createTestDraftProject(model, request, NOW);
    expect(id).toBe(55);

    const project = calls.find((c) => c.method === "POST" && c.url === "/api/projects")!;
    expect(project.data).toMatchObject({
      onSiteSelection: model,
      contractType: "MASTER_EF",
      llcId: 7,
      buyerType: TEST_DRAFT_PROFILES[model].buyerType,
      state: TEST_DRAFT_PROFILES[model].site.state,
    });

    const client = calls.find((c) => c.url === "/api/projects/55/client")!;
    expect(client.data).toMatchObject(TEST_DRAFT_PROFILES[model].client);

    const contractor = calls.find((c) => c.url === "/api/projects/55/contractors")!;
    expect(contractor.data).toMatchObject({
      contractorType: "onsite_general",
      licenseNumber: TEST_DRAFT_PROFILES[model].onsiteContractor.licenseNumber,
    });

    // Exhibit A.1's jurisdiction row and A.8's assumptions line read these.
    const details = calls.find((c) => c.method === "PATCH" && c.url === "/api/projects/55/details")!;
    const { site, siteAccessAssumptions } = TEST_DRAFT_PROFILES[model];
    expect(details.data).toMatchObject({
      deliveryCounty: site.county,
      permittingAuthority: site.permittingAuthority || null,
      fbhApprovalNumber: site.fbhApprovalNumber || null,
      siteAccessAssumptions: siteAccessAssumptions || null,
    });

    const phases = calls.filter((c) => c.url === "/api/projects/55/phases");
    const properties = calls.filter((c) => c.url === "/api/projects/55/properties");
    const units = calls.filter((c) => c.url === "/api/projects/55/units");
    expect(phases).toHaveLength(2);
    expect(properties).toHaveLength(2);
    expect(units).toHaveLength(2);
  });

  it("links each property to its own phase and each home to its own property", async () => {
    const { calls, request } = fakeApi();
    await createTestDraftProject("CRC", request, NOW);
    const properties = calls.filter((c) => c.url.endsWith("/properties"));
    const units = calls.filter((c) => c.url.endsWith("/units"));
    // The fake answers phases with ids 200, 201 and properties with 301 (P-1), 302 (P-2).
    expect(properties.map((c) => c.data.phaseId)).toEqual([200, 201]);
    expect(units.map((c) => c.data)).toEqual([
      expect.objectContaining({ modelId: 13, propertyId: 301, unitRole: "home", unitLabel: "P-1 Home" }),
      expect.objectContaining({ modelId: 13, propertyId: 302, unitRole: "home", unitLabel: "P-2 Home" }),
    ]);
  });

  it("only gives Dvele GC phases on-site days", async () => {
    for (const [model, expected] of [["FOB", 0], ["CRC", 0], ["CMOS", 60]] as const) {
      const { calls, request } = fakeApi();
      await createTestDraftProject(model, request, NOW);
      const phase = calls.find((c) => c.url.endsWith("/phases"))!;
      expect(phase.data.onsiteDays).toBe(expected);
    }
  });

  it("gives the California GC an insurer and phone for the Exhibit F insurance notice", async () => {
    const { calls, request } = fakeApi();
    await createTestDraftProject("CRC", request, NOW);
    const contractor = calls.find((c) => c.url === "/api/projects/55/contractors")!;
    expect(contractor.data).toMatchObject({ insuranceCarrier: expect.any(String), insurancePhone: expect.any(String) });
  });

  it("refuses to build without a home model", async () => {
    const { request } = fakeApi({ homeModels: [] });
    await expect(createTestDraftProject("FOB", request, NOW)).rejects.toThrow(/No active home models/);
  });

  it("refuses to build without the Dvele AZ, LLC seller, and creates nothing", async () => {
    const { calls, request } = fakeApi({ llcs: [{ id: 1, name: "Dvele Partners Sample LLC" }] });
    await expect(createTestDraftProject("FOB", request, NOW)).rejects.toThrow(/Dvele AZ, LLC/);
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });
});
