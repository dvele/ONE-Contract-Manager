import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";
import { syncCatalog } from "../services/catalogSync";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

// Common SELECT with camelCase aliases (matches actual DB columns)
const selectFields = `
  id, organization_id as "organizationId", name, model_code as "modelCode",
  sq_ft as "sqFt", bedrooms, bathrooms,
  design_fee as "designFee", offsite_base_price as "offsiteBasePrice",
  onsite_est_price as "onsiteEstPrice", shipping_set_price as "shippingSetPrice",
  is_active as "isActive",
  created_at as "createdAt", updated_at as "updatedAt"
`;

router.get("/home-models", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ${selectFields} FROM home_models 
       WHERE organization_id = $1 AND is_active = true 
       ORDER BY name`,
      [req.organizationId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching home models:", error);
    res.status(500).json({ error: "Failed to fetch home models" });
  }
});

router.get("/home-models/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ${selectFields} FROM home_models 
       WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Home model not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching home model:", error);
    res.status(500).json({ error: "Failed to fetch home model" });
  }
});

router.post("/home-models", async (req: Request, res: Response) => {
  try {
    const { name, modelCode, sqFt, bedrooms, bathrooms, designFee, offsiteBasePrice, onsiteEstPrice, shippingSetPrice } = req.body;
    
    const result = await pool.query(
      `INSERT INTO home_models (organization_id, name, model_code, sq_ft, bedrooms, bathrooms, design_fee, offsite_base_price, onsite_est_price, shipping_set_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${selectFields}`,
      [req.organizationId, name, modelCode, sqFt, bedrooms, bathrooms, designFee, offsiteBasePrice, onsiteEstPrice, shippingSetPrice]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating home model:", error);
    res.status(500).json({ error: "Failed to create home model" });
  }
});

router.patch("/home-models/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, modelCode, sqFt, bedrooms, bathrooms, designFee, offsiteBasePrice, onsiteEstPrice, shippingSetPrice, isActive } = req.body;
    
    const result = await pool.query(
      `UPDATE home_models SET 
       name = COALESCE($3, name),
       model_code = COALESCE($4, model_code),
       sq_ft = COALESCE($5, sq_ft),
       bedrooms = COALESCE($6, bedrooms),
       bathrooms = COALESCE($7, bathrooms),
       design_fee = COALESCE($8, design_fee),
       offsite_base_price = COALESCE($9, offsite_base_price),
       onsite_est_price = COALESCE($10, onsite_est_price),
       shipping_set_price = COALESCE($11, shipping_set_price),
       is_active = COALESCE($12, is_active),
       updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING ${selectFields}`,
      [id, req.organizationId, name, modelCode, sqFt, bedrooms, bathrooms, designFee, offsiteBasePrice, onsiteEstPrice, shippingSetPrice, isActive]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Home model not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating home model:", error);
    res.status(500).json({ error: "Failed to update home model" });
  }
});

router.post("/home-models/sync", async (req: Request, res: Response) => {
  try {
    const result = await syncCatalog(req.organizationId!);
    res.json(result);
  } catch (error: any) {
    console.error("Error syncing catalog:", error);
    res.status(500).json({ error: error.message || "Failed to sync catalog" });
  }
});

router.delete("/home-models/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE home_models SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING ${selectFields}`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Home model not found" });
    }
    
    res.json({ message: "Home model deactivated" });
  } catch (error: any) {
    console.error("Error deleting home model:", error);
    res.status(500).json({ error: "Failed to delete home model" });
  }
});

export default router;
