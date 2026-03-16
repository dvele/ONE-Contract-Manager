import type { Express } from "express";
import type { Server } from "http";
import apiRouter from "./routes/index";
import { requireAuth } from "./middleware/auth";
import { pool } from "./db";
import { seedProductionData } from "./seed";

// =============================================================================
// REGISTER ALL API ROUTES
// =============================================================================

async function seedDefaults() {
  try {
    await pool.query(
      `INSERT INTO organizations (id, name, slug, created_at)
       VALUES (1, 'Dvele', 'dvele', NOW())
       ON CONFLICT (id) DO NOTHING`
    );

    const homeModels = [
      { name: 'Fernie', code: 'FERNIE', bed: 1, bath: 1, sqft: 545, design: 800000, offsite: 20606667, onsite: 10448900 },
      { name: 'Baffin 1', code: 'BAFFIN-1', bed: 1, bath: 1, sqft: 702, design: 800000, offsite: 26546667, onsite: 10581150 },
      { name: 'Baffin 2', code: 'BAFFIN-2', bed: 2, bath: 1, sqft: 887, design: 800000, offsite: 32120000, onsite: 11426400 },
      { name: 'Gabriel', code: 'GABRIEL', bed: 2, bath: 2, sqft: 1484, design: 800000, offsite: 43442667, onsite: 36405090 },
      { name: 'Sierra', code: 'SIERRA', bed: 3, bath: 2.5, sqft: 1681, design: 800000, offsite: 47608000, onsite: 37066225 },
      { name: 'Catalina', code: 'CATALINA', bed: 3, bath: 2.5, sqft: 1724, design: 800000, offsite: 54560000, onsite: 38989888 },
      { name: 'Solara', code: 'SOLARA', bed: 3, bath: 2.5, sqft: 1724, design: 800000, offsite: 54560000, onsite: 39673333 },
      { name: 'Lumina', code: 'LUMINA', bed: 4, bath: 3, sqft: 2053, design: 800000, offsite: 58784000, onsite: 39515610 },
    ];

    const existing = await pool.query('SELECT model_code FROM home_models WHERE organization_id = 1');
    const existingCodes = new Set(existing.rows.map((r: any) => r.model_code));

    for (const m of homeModels) {
      if (!existingCodes.has(m.code)) {
        await pool.query(
          `INSERT INTO home_models (name, model_code, bedrooms, bathrooms, sq_ft, design_fee, offsite_base_price, onsite_est_price, is_active, organization_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,1,NOW(),NOW())`,
          [m.name, m.code, m.bed, m.bath, m.sqft, m.design, m.offsite, m.onsite]
        );
      }
    }
    console.log("Default organization and home models seeded");
  } catch (err) {
    console.warn("Could not seed defaults:", err);
  }
}

export async function registerRoutes(server: Server, app: Express) {
  await seedDefaults();
  await seedProductionData();

  app.use("/api", requireAuth, apiRouter);
  
  console.log("API routes registered successfully");
}
