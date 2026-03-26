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

    console.log("Default organization seeded");
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
