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
  pu.property_id as "propertyId", pu.unit_role as "unitRole",
  hm.name as "modelName", hm.model_code as "modelCode",
  p.name as "projectName"
`;

router.get("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    let query = `
      SELECT ${selectFields}
      FROM project_units pu
      LEFT JOIN home_models hm ON pu.model_id = hm.id
      LEFT JOIN projects p ON pu.project_id = p.id
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
  notes, created_at as "createdAt",
  property_id as "propertyId", unit_role as "unitRole"
`;

const UNIT_ROLES = ["home", "adu"] as const;
type UnitRole = (typeof UNIT_ROLES)[number];

/**
 * A property holds at most one home and one ADU. Returns an error message when
 * the requested role is already taken, or null when the attachment is allowed.
 *
 * @param excludeUnitId - unit being updated, so it does not conflict with itself
 */
async function roleConflict(
  propertyId: number,
  unitRole: UnitRole,
  excludeUnitId: number | null,
): Promise<string | null> {
  const result = await pool.query(
    `SELECT id FROM project_units
     WHERE property_id = $1 AND unit_role = $2 AND ($3::int IS NULL OR id <> $3)`,
    [propertyId, unitRole, excludeUnitId],
  );
  return result.rows.length > 0
    ? `This property already has a ${unitRole}`
    : null;
}

async function propertyAccessible(
  propertyId: number,
  organizationId: number,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM properties WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
    [propertyId, organizationId],
  );
  return result.rows.length > 0;
}

router.post("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId, modelId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    if (propertyId != null) {
      if (!(await propertyAccessible(propertyId, req.organizationId))) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (!UNIT_ROLES.includes(unitRole)) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
      const conflict = await roleConflict(propertyId, unitRole, null);
      if (conflict) return res.status(409).json({ error: conflict });
    }

    const result = await pool.query(
      `INSERT INTO project_units (organization_id, project_id, model_id, unit_label, quantity, base_price_snapshot, customization_total, notes, property_id, unit_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${returningFields}`,
      [req.organizationId, projectId, modelId, unitLabel, quantity || 1,
       basePriceSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
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
    const { modelId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    if (propertyId != null) {
      if (!(await propertyAccessible(propertyId, req.organizationId))) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (!UNIT_ROLES.includes(unitRole)) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
      const conflict = await roleConflict(
        propertyId, unitRole, parseInt(String(id), 10)
      );
      if (conflict) return res.status(409).json({ error: conflict });
    }

    const result = await pool.query(
      `UPDATE project_units SET
       model_id = COALESCE($3, model_id),
       unit_label = COALESCE($4, unit_label),
       quantity = COALESCE($5, quantity),
       base_price_snapshot = COALESCE($6, base_price_snapshot),
       customization_total = COALESCE($7, customization_total),
       notes = COALESCE($8, notes),
       property_id = COALESCE($9, property_id),
       unit_role = COALESCE($10, unit_role)
       WHERE id = $1 AND organization_id = $2
       RETURNING ${returningFields}`,
      [id, req.organizationId, modelId, unitLabel, quantity,
       basePriceSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
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
