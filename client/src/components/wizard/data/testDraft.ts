import { DELIVERY_MODEL_LABELS, type DeliveryModel } from "@shared/deliveryModel";

/**
 * "Load Test Draft" builds a real saved project, not just wizard form state.
 * Phases, properties and units live in their own tables keyed to a project id,
 * so a test draft that only filled the form generated an agreement with no
 * homes, no pricing and no A.2/A.5/B.1 rows. Creating it through the same
 * endpoints the wizard uses means every step reads it the way it would read a
 * draft someone had keyed in.
 *
 * The request function is injected so this can be exercised without a browser.
 */

export type RequestFn = (method: string, url: string, data?: unknown) => Promise<Response>;

/** The seller every project selects for now (Decision 3 of the 2026 agreement plan). */
export const TEST_DRAFT_SELLER = "Dvele AZ, LLC";

interface TestDraftProfile {
  buyerType: "end_customer" | "developer";
  client: {
    legalName: string;
    entityType: string;
    formationState: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
  };
  site: { address: string; city: string; state: string; zip: string; county: string };
  arbitrationLocation: string;
  onsiteContractor: {
    legalName: string;
    licenseNumber: string;
    licenseState: string;
    contactName: string;
    contactEmail: string;
  };
}

/**
 * One profile per Delivery Model, each chosen to exercise a different part of
 * the agreement: FOB a Developer buyer, Delivered to Site the California
 * warranty statute prefix, Dvele GC an individual buyer and the GC Affiliate.
 */
export const TEST_DRAFT_PROFILES: Record<DeliveryModel, TestDraftProfile> = {
  FOB: {
    buyerType: "developer",
    client: {
      legalName: "Sonoran Homes Development LLC",
      entityType: "LLC",
      formationState: "AZ",
      address: "100 N Central Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85004",
      email: "contracts@sonoranhomes.example",
      phone: "602-555-0101",
    },
    site: { address: "210 Desert Bloom Ln", city: "Scottsdale", state: "AZ", zip: "85251", county: "Maricopa" },
    arbitrationLocation: "Maricopa County, Arizona",
    onsiteContractor: {
      legalName: "Sonoran Site Builders LLC",
      licenseNumber: "ROC-123456",
      licenseState: "AZ",
      contactName: "Pat Rivera",
      contactEmail: "pat@sonoransite.example",
    },
  },
  CRC: {
    buyerType: "end_customer",
    client: {
      legalName: "Golden State Ventures LLC",
      entityType: "LLC",
      formationState: "DE",
      address: "1 Market St",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      email: "owner@goldenstate.example",
      phone: "415-555-0102",
    },
    site: { address: "44 Vineyard Rd", city: "Sonoma", state: "CA", zip: "95476", county: "Sonoma" },
    arbitrationLocation: "Sonoma County, California",
    onsiteContractor: {
      legalName: "Bay Area Builders Inc",
      licenseNumber: "CSLB-1048576",
      licenseState: "CA",
      contactName: "Sam Ortega",
      contactEmail: "sam@bayareabuilders.example",
    },
  },
  CMOS: {
    buyerType: "end_customer",
    client: {
      legalName: "Jordan Lee",
      entityType: "Individual",
      formationState: "",
      address: "8 Saguaro Ct",
      city: "Tucson",
      state: "AZ",
      zip: "85718",
      email: "jordan.lee@example.com",
      phone: "520-555-0103",
    },
    site: { address: "8 Saguaro Ct", city: "Tucson", state: "AZ", zip: "85718", county: "Pima" },
    arbitrationLocation: "Pima County, Arizona",
    onsiteContractor: {
      legalName: "Dvele Construction AZ, LLC",
      licenseNumber: "ROC-654321",
      licenseState: "AZ",
      contactName: "Morgan Hale",
      contactEmail: "morgan@dvele.example",
    },
  },
};

/** Two phases, one property each, one home per property: enough to fill A.2, A.5 and B.1. */
const PHASE_COUNT = 2;

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/** Creates the saved project for `model` and returns its id. */
export async function createTestDraftProject(
  model: DeliveryModel,
  request: RequestFn,
  now: Date = new Date()
): Promise<number> {
  const profile = TEST_DRAFT_PROFILES[model];

  const homeModels = await json<{ id: number; name: string }[]>(await request("GET", "/api/home-models"));
  if (homeModels.length === 0) {
    throw new Error("No active home models. Add one under Admin Settings → Home Models first.");
  }
  const llcs = await json<{ id: number; name: string }[]>(await request("GET", "/api/llcs"));
  const seller = llcs.find((llc) => llc.name.trim().toLowerCase() === TEST_DRAFT_SELLER.toLowerCase());
  if (!seller) {
    throw new Error(`No "${TEST_DRAFT_SELLER}" LLC. Run the Master EF 2026 installer first.`);
  }

  const project = await json<{ id: number }>(
    await request("POST", "/api/projects", {
      projectNumber: `TEST-${now.getTime().toString(36).toUpperCase()}`,
      name: `Test Draft – ${DELIVERY_MODEL_LABELS[model]}`,
      status: "Draft",
      state: profile.site.state,
      onSiteSelection: model,
      contractType: "MASTER_EF",
      buyerType: profile.buyerType,
      itemizeDesignFee: false,
      storageFeePerDay: 15000,
      storageFreedays: 14,
      adminFeePercent: 10,
      llcId: seller.id,
    })
  );
  const projectId = project.id;

  await request("POST", `/api/projects/${projectId}/client`, { projectId, ...profile.client });
  await request("POST", `/api/projects/${projectId}/financials`, {
    projectId,
    designFee: 15000_00,
    designRevisionRounds: 3,
  });
  await request("PATCH", `/api/projects/${projectId}/details`, {
    projectId,
    deliveryAddress: profile.site.address,
    deliveryCity: profile.site.city,
    deliveryState: profile.site.state,
    deliveryZip: profile.site.zip,
    deliveryCounty: profile.site.county,
    agreementExecutionDate: now.toISOString().split("T")[0],
    arbitrationLocation: profile.arbitrationLocation,
    totalUnits: PHASE_COUNT,
  });
  await request("POST", `/api/projects/${projectId}/contractors`, {
    projectId,
    contractorType: "onsite_general",
    ...profile.onsiteContractor,
  });

  const homeModel = homeModels[0];
  for (let i = 0; i < PHASE_COUNT; i++) {
    const phase = await json<{ id: number }>(
      await request("POST", `/api/projects/${projectId}/phases`, {
        name: `Phase ${i + 1}`,
        startOffsetDays: i * 90,
        manufacturingDays: 120,
        onsiteDays: model === "CMOS" ? 60 : 0,
        deliveryLagDays: 14,
      })
    );
    const property = await json<{ id: number; propertyCode: string }>(
      await request("POST", `/api/projects/${projectId}/properties`, {
        phaseId: phase.id,
        address: i === 0 ? profile.site.address : `Lot ${i + 1}, ${profile.site.address}`,
        city: profile.site.city,
        state: profile.site.state,
        zip: profile.site.zip,
      })
    );
    await request("POST", `/api/projects/${projectId}/units`, {
      modelId: homeModel.id,
      propertyId: property.id,
      unitRole: "home",
      quantity: 1,
      unitLabel: `${property.propertyCode} Home`,
    });
  }

  return projectId;
}
