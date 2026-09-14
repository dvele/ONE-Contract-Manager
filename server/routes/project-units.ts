import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";
import {
  UNIQUE_VIOLATION,
  configurationForProject,
  isUnitRole,
  modelForOrganization,
  pricingSourceError,
  projectAccessible,
  propertyAccessible,
  propertyQuantityError,
  roleConflict,
} from "../lib/unit-attachment";

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
  pu.configuration_id as "configurationId",
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
  property_id as "propertyId", unit_role as "unitRole",
  configuration_id as "configurationId"
`;

router.post("/project-units", async (req: Request, res: Response) => {
  try {
    const { projectId, modelId, configurationId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    const sourceError = pricingSourceError(modelId, configurationId);
    if (sourceError) return res.status(400).json({ error: sourceError });

    const quantityError = propertyQuantityError(propertyId, quantity);
    if (quantityError) return res.status(400).json({ error: quantityError });

    // The project id comes from the body and is written into `project_id`, so
    // it is checked before anything is read or inserted against it — the
    // configuration and property paths bind the project themselves, the
    // model-only path has nothing else that would.
    if (!(await projectAccessible(projectId, req.organizationId))) {
      return res.status(404).json({ error: "Project not found" });
    }

    // A configuration's derived price is the only authoritative price for a unit
    // built from it, so it overrides whatever snapshot the body carried.
    let resolvedSnapshot = basePriceSnapshot;
    if (configurationId != null) {
      const configuration = await configurationForProject(
        configurationId, req.organizationId, projectId,
      );
      if (!configuration) {
        return res.status(404).json({ error: "Unit configuration not found" });
      }
      resolvedSnapshot = configuration.derived_offsite_price;
    } else if (!(await modelForOrganization(modelId, req.organizationId))) {
      // The foreign key only requires the model to exist, not to belong to the
      // caller, and the pricing engine reads its offsite base price straight
      // off the join — so an unscoped model id here prices this project from
      // another organization's catalog.
      return res.status(404).json({ error: "Home model not found" });
    }

    if (propertyId != null) {
      if (!(await propertyAccessible(propertyId, req.organizationId, projectId))) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (!isUnitRole(unitRole)) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
      const conflict = await roleConflict(propertyId, unitRole, null);
      if (conflict) return res.status(409).json({ error: conflict });
    }

    const result = await pool.query(
      `INSERT INTO project_units (organization_id, project_id, model_id, configuration_id, unit_label, quantity, base_price_snapshot, customization_total, notes, property_id, unit_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${returningFields}`,
      [req.organizationId, projectId, modelId ?? null, configurationId ?? null,
       unitLabel, quantity || 1,
       resolvedSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    // See the same translation in server/routes/projects.ts: the unique
    // constraint decides the race that roleConflict cannot.
    if (error?.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: "This property already has a unit in that role" });
    }
    console.error("Error creating project unit:", error);
    res.status(500).json({ error: "Failed to create project unit" });
  }
});

/**
 * A body id field: absent leaves the column alone, explicit null clears it.
 *
 * An unparseable value is an error naming the field rather than a `NaN` that
 * satisfies every guard below and only fails at Postgres as a 500.
 */
function resolveId(
  supplied: unknown,
  current: number | null,
  field: string,
): { value: number | null } | { error: string } {
  if (supplied === undefined) return { value: current };
  if (supplied === null) return { value: null };
  if (typeof supplied !== "number" && typeof supplied !== "string") {
    return { error: `${field} must be a positive integer` };
  }
  const parsed = Number(supplied);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${field} must be a positive integer` };
  }
  return { value: parsed };
}

router.patch("/project-units/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modelId, configurationId, unitLabel, quantity, basePriceSnapshot,
            customizationTotal, notes, propertyId, unitRole } = req.body;

    // Every guard below decides against the unit that will exist after the
    // patch, not against the body alone — a unit half-described by the request
    // can still end up with two pricing sources or none.
    const existingUnit = await pool.query(
      `SELECT project_id, property_id, model_id, configuration_id, quantity
       FROM project_units WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId],
    );
    if (existingUnit.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }
    const existing = existingUnit.rows[0];

    const modelIdResult = resolveId(modelId, existing.model_id, "modelId");
    if ("error" in modelIdResult) {
      return res.status(400).json({ error: modelIdResult.error });
    }
    const configurationIdResult = resolveId(
      configurationId, existing.configuration_id, "configurationId",
    );
    if ("error" in configurationIdResult) {
      return res.status(400).json({ error: configurationIdResult.error });
    }
    const resolvedModelId = modelIdResult.value;
    const resolvedConfigurationId = configurationIdResult.value;

    const sourceError = pricingSourceError(resolvedModelId, resolvedConfigurationId);
    if (sourceError) return res.status(400).json({ error: sourceError });

    const effectivePropertyId = propertyId ?? existing.property_id;
    const effectiveQuantity = quantity ?? existing.quantity;
    const quantityError = propertyQuantityError(effectivePropertyId, effectiveQuantity);
    if (quantityError) return res.status(400).json({ error: quantityError });

    // The snapshot is derived from whichever source now prices the unit, so a
    // figure in the body cannot become the price of a configuration-backed
    // unit — the same rule both POST paths apply.
    let resolvedSnapshot: number | null = basePriceSnapshot ?? null;
    if (resolvedConfigurationId !== null) {
      const configuration = await configurationForProject(
        resolvedConfigurationId, req.organizationId, existing.project_id,
      );
      if (!configuration) {
        return res.status(404).json({ error: "Unit configuration not found" });
      }
      resolvedSnapshot = configuration.derived_offsite_price;
    } else if (resolvedModelId !== null && resolvedModelId !== existing.model_id) {
      const model = await modelForOrganization(resolvedModelId, req.organizationId);
      if (!model) {
        return res.status(404).json({ error: "Home model not found" });
      }
      resolvedSnapshot = model.offsite_base_price;
    }

    if (propertyId != null || unitRole != null) {
      if (propertyId != null &&
          !(await propertyAccessible(propertyId, req.organizationId, existing.project_id))) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (unitRole != null) {
        if (!isUnitRole(unitRole)) {
          return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
        }
        if (effectivePropertyId != null) {
          const conflict = await roleConflict(
            effectivePropertyId, unitRole, parseInt(String(id), 10)
          );
          if (conflict) return res.status(409).json({ error: conflict });
        }
      } else if (propertyId != null) {
        return res.status(400).json({ error: "unitRole must be 'home' or 'adu'" });
      }
    }

    const result = await pool.query(
      `UPDATE project_units SET
       model_id = $3,
       configuration_id = $4,
       unit_label = COALESCE($5, unit_label),
       quantity = COALESCE($6, quantity),
       base_price_snapshot = COALESCE($7, base_price_snapshot),
       customization_total = COALESCE($8, customization_total),
       notes = COALESCE($9, notes),
       property_id = COALESCE($10, property_id),
       unit_role = COALESCE($11, unit_role)
       WHERE id = $1 AND organization_id = $2
       RETURNING ${returningFields}`,
      [id, req.organizationId, resolvedModelId, resolvedConfigurationId,
       unitLabel, quantity,
       resolvedSnapshot, customizationTotal, notes,
       propertyId ?? null, unitRole ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project unit not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: "This property already has a unit in that role" });
    }
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
