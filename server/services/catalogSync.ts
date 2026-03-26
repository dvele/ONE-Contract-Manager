import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ODOO_MODULES_URL = "https://one-api.dvele.com/odoo/modules/";

interface OdooModule {
  id: number;
  x_studio_sku: string;
  x_studio_product_plan_name: string;
  x_studio_number_of_bedrooms: number;
  x_studio_number_of_bathrooms: number;
  x_studio_area_sqft: string;
  x_studio_stories_1: number;
  x_studio_submodules: number[];
  list_price: number;
  base_onsite_price: number;
  base_install_price: number;
  base_transport_price: number;
}

function mapOdooModule(r: OdooModule) {
  return {
    name: r.x_studio_product_plan_name,
    modelCode: r.x_studio_sku,
    sqFt: parseInt(r.x_studio_area_sqft) || null,
    bedrooms: r.x_studio_number_of_bedrooms || null,
    bathrooms: r.x_studio_number_of_bathrooms || null,
    stories: Math.floor(r.x_studio_stories_1 || 0) || null,
    offsiteBasePrice: Math.round((r.list_price || 0) * 100),
    onsiteEstPrice: Math.round((r.base_onsite_price || 0) * 100),
    shippingSetPrice: Math.round(
      ((r.base_install_price || 0) + (r.base_transport_price || 0)) * 100
    ),
  };
}

export async function syncCatalog(
  organizationId: number
): Promise<{ synced: number; errors: number }> {
  const response = await fetch(ODOO_MODULES_URL);

  if (!response.ok) {
    throw new Error(
      `Odoo API returned ${response.status}: ${await response.text()}`
    );
  }

  const records: OdooModule[] = (await response.json()).filter(
    (r: OdooModule) => r.x_studio_submodules?.length > 0
  );
  let synced = 0;
  let errors = 0;

  for (const record of records) {
    try {
      const m = mapOdooModule(record);
      await pool.query(
        `INSERT INTO home_models
           (organization_id, name, model_code, sq_ft, bedrooms, bathrooms, stories,
            offsite_base_price, onsite_est_price, shipping_set_price, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
         ON CONFLICT (organization_id, model_code) DO UPDATE SET
           name               = EXCLUDED.name,
           sq_ft              = EXCLUDED.sq_ft,
           bedrooms           = EXCLUDED.bedrooms,
           bathrooms          = EXCLUDED.bathrooms,
           stories            = EXCLUDED.stories,
           offsite_base_price = EXCLUDED.offsite_base_price,
           onsite_est_price   = EXCLUDED.onsite_est_price,
           shipping_set_price = EXCLUDED.shipping_set_price,
           updated_at         = NOW()`,
        [
          organizationId,
          m.name,
          m.modelCode,
          m.sqFt,
          m.bedrooms,
          m.bathrooms,
          m.stories,
          m.offsiteBasePrice,
          m.onsiteEstPrice,
          m.shippingSetPrice,
        ]
      );
      synced++;
    } catch (err) {
      console.error(
        `[CatalogSync] Failed to upsert model ${record.x_studio_sku}:`,
        err
      );
      errors++;
    }
  }

  console.log(
    `[CatalogSync] org=${organizationId} synced=${synced} errors=${errors}`
  );
  return { synced, errors };
}

/**
 * Syncs catalog for every organization in the DB.
 * Used by the scheduled cron job — requires ODOO_SERVICE_TOKEN env var.
 */
export async function syncCatalogAllOrgs(): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM organizations WHERE is_active = true`
  );

  for (const org of rows) {
    try {
      await syncCatalog(org.id);
    } catch (err) {
      console.error(`[CatalogSync] Failed for org ${org.id}:`, err);
    }
  }
}
