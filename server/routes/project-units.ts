import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

const selectFields = `
  pu.id, pu.organization_id as "organizationId", pu.project_id as "projectId",
  pu.model_id as "modelId", pu.unit_label as "unitLabel",
  pu.quantity,
  pu.base_price_snapshot as "basePriceSnapshot",
  pu.customization_total as "customizationTotal",
  pu.notes, pu.created_at as "createdAt",
  hm.name as "modelName", hm.model_code as "modelCode"
`;

router.get("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    let query = `
      SELECT ${selectFields}
      FROM project_units pu
      LEFT JOIN home_models hm ON pu.model_id = hm.id
      WHERE pu.organization_id = $1`;
    const params: any[] = [req.organizationId];
    
    if (projectId) {
      query += ` AND pu.project_id = $2`;
      params.push(projectId);
    }
    
    query += ` ORDER BY pu.unit_label`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching project units:", error);
    res.status(500).json({ error: "Failed to fetch project units" });
  }
});

router.get("/project-units/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM project_units pu
       LEFT JOIN home_models hm ON pu.model_id = hm.id
       WHERE pu.id = $1 AND pu.organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching project unit:", error);
    res.status(500).json({ error: "Failed to fetch project unit" });
  }
});

const returningFields = `
  id, organization_id as "organizationId", project_id as "projectId",
  model_id as "modelId", unit_label as "unitLabel",
  quantity,
  base_price_snapshot as "basePriceSnapshot",
  customization_total as "customizationTotal",
  notes, created_at as "createdAt"
`;

router.post("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId, modelId, unitLabel, quantity, basePriceSnapshot, customizationTotal, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO project_units (organization_id, project_id, model_id, unit_label, quantity, base_price_snapshot, customization_total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${returningFields}`,
      [req.organizationId, projectId, modelId, unitLabel, quantity || 1, basePriceSnapshot, customizationTotal, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating project unit:", error);
    res.status(500).json({ error: "Failed to create project unit" });
  }
});

router.patch("/project-units/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modelId, unitLabel, quantity, basePriceSnapshot, customizationTotal, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE project_units SET 
       model_id = COALESCE($3, model_id),
       unit_label = COALESCE($4, unit_label),
       quantity = COALESCE($5, quantity),
       base_price_snapshot = COALESCE($6, base_price_snapshot),
       customization_total = COALESCE($7, customization_total),
       notes = COALESCE($8, notes)
       WHERE id = $1 AND organization_id = $2
       RETURNING ${returningFields}`,
      [id, req.organizationId, modelId, unitLabel, quantity, basePriceSnapshot, customizationTotal, notes]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating project unit:", error);
    res.status(500).json({ error: "Failed to update project unit" });
  }
});

router.delete("/project-units/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM project_units 
       WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)
       RETURNING id`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }
    
    res.json({ message: "Project unit deleted" });
  } catch (error: any) {
    console.error("Error deleting project unit:", error);
    res.status(500).json({ error: "Failed to delete project unit" });
  }
});

export default router;
