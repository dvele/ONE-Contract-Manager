import { Router } from "express";
import { db } from "../db/index";
import { pool } from "../db";
import {
  projects,
  clients,
  projectDetails,
  contractors,
  milestones,
  warrantyTerms,
} from "../../shared/schema";
import { eq, ne, and, sql, desc } from "drizzle-orm";

const router = Router();

// ---------------------------------------------------------------------------
// PROJECT NUMBER UNIQUENESS CHECK
// ---------------------------------------------------------------------------

router.get('/projects/check-number/:projectNumber', async (req, res) => {
  try {
    const { projectNumber } = req.params;
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : null;
    
    if (!projectNumber) {
      return res.json({ isUnique: true });
    }
    
    // Check if project number exists
    let query = db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.projectNumber, projectNumber));
    
    const existingProjects = await query;
    
    // If excluding a specific ID (for edit mode), check if the only match is the excluded one
    if (excludeId && existingProjects.length === 1 && existingProjects[0].id === excludeId) {
      return res.json({ isUnique: true });
    }
    
    res.json({ isUnique: existingProjects.length === 0 });
  } catch (error) {
    console.error("Failed to check project number:", error);
    res.json({ isUnique: true }); // Default to true to not block on errors
  }
});

// ---------------------------------------------------------------------------
// DEBUG - Variable Audit (temporary)
// ---------------------------------------------------------------------------

router.get('/debug/audit-variables', async (req, res) => {
  try {
    console.log('Starting variable audit...');
    
    const clauseResult = await pool.query('SELECT * FROM clauses');
    const clauseList = clauseResult.rows || [];
    
    console.log(`Fetched ${clauseList.length} clauses`);
    
    const variableSet = new Set<string>();
    const variablesByContract: Record<string, Set<string>> = {
      ONE: new Set(),
      MANUFACTURING: new Set(),
      ONSITE: new Set()
    };
    
    clauseList.forEach((clause: any) => {
      // Updated to use new atomic clause field names: bodyHtml, headerText, contractTypes
      const content = (clause.bodyHtml || '') + ' ' + (clause.headerText || '');
      const matches = content.match(/\{\{([A-Z_0-9]+)\}\}/g);
      
      if (matches) {
        matches.forEach((match: string) => {
          const varName = match.replace(/[{}]/g, '');
          variableSet.add(varName);
          
          // contractTypes is now a JSONB array
          const contractTypes: string[] = clause.contractTypes || [];
          const contractTypesLower = contractTypes.map((t: string) => t.toLowerCase());
          
          if (contractTypesLower.some((t: string) => t.includes('one'))) {
            variablesByContract.ONE.add(varName);
          }
          if (contractTypesLower.some((t: string) => t.includes('manufacturing') || t.includes('offsite'))) {
            variablesByContract.MANUFACTURING.add(varName);
          }
          if (contractTypesLower.some((t: string) => t.includes('onsite') || t.includes('installation'))) {
            variablesByContract.ONSITE.add(varName);
          }
        });
      }
    });
    
    const allVariables = Array.from(variableSet).sort();
    
    const oneVars = Array.from(variablesByContract.ONE);
    const mfgVars = Array.from(variablesByContract.MANUFACTURING);
    const onsiteVars = Array.from(variablesByContract.ONSITE);
    
    const commonVars = allVariables.filter(v => 
      variablesByContract.ONE.has(v) && 
      variablesByContract.MANUFACTURING.has(v) && 
      variablesByContract.ONSITE.has(v)
    );
    
    const oneOnly = allVariables.filter(v => 
      variablesByContract.ONE.has(v) && 
      !variablesByContract.MANUFACTURING.has(v) && 
      !variablesByContract.ONSITE.has(v)
    );
    
    const mfgOnly = allVariables.filter(v => 
      !variablesByContract.ONE.has(v) && 
      variablesByContract.MANUFACTURING.has(v) && 
      !variablesByContract.ONSITE.has(v)
    );
    
    const onsiteOnly = allVariables.filter(v => 
      !variablesByContract.ONE.has(v) && 
      !variablesByContract.MANUFACTURING.has(v) && 
      variablesByContract.ONSITE.has(v)
    );
    
    console.log('\n=== VARIABLE AUDIT COMPLETE ===');
    console.log(`Total unique variables: ${allVariables.length}`);
    console.log(`Common across all three: ${commonVars.length}`);
    console.log(`ONE only: ${oneOnly.length}`);
    console.log(`MANUFACTURING only: ${mfgOnly.length}`);
    console.log(`ONSITE only: ${onsiteOnly.length}`);
    
    res.json({
      summary: {
        totalVariables: allVariables.length,
        clausesChecked: clauseList.length,
        commonVariables: commonVars.length,
        oneOnlyVariables: oneOnly.length,
        manufacturingOnlyVariables: mfgOnly.length,
        onsiteOnlyVariables: onsiteOnly.length
      },
      allVariables: allVariables,
      byContract: {
        ONE: { total: oneVars.length, variables: oneVars.sort() },
        MANUFACTURING: { total: mfgVars.length, variables: mfgVars.sort() },
        ONSITE: { total: onsiteVars.length, variables: onsiteVars.sort() }
      },
      analysis: {
        commonToAll: commonVars.sort(),
        oneOnly: oneOnly.sort(),
        manufacturingOnly: mfgOnly.sort(),
        onsiteOnly: onsiteOnly.sort()
      }
    });
    
  } catch (error: any) {
    console.error('Variable audit error:', error);
    res.status(500).json({ 
      error: 'Failed to audit variables', 
      message: error.message 
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------------------------

router.get("/projects/next-number", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    
    const allProjects = await db
      .select({ projectNumber: projects.projectNumber })
      .from(projects);
    
    const thisYearProjects = allProjects.filter(p => 
      p.projectNumber && p.projectNumber.startsWith(yearPrefix)
    );
    
    let maxNumber = 0;
    for (const p of thisYearProjects) {
      const numPart = p.projectNumber.split('-')[1];
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
    
    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    const nextProjectNumber = `${yearPrefix}${nextNumber}`;
    
    res.json({ nextProjectNumber });
  } catch (error) {
    console.error("Failed to get next project number:", error);
    res.status(500).json({ error: "Failed to get next project number" });
  }
});

router.get("/projects", async (req, res) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    res.json(allProjects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    let { llcId, ...projectData } = req.body;
    
    // Auto-generate LLC if not provided
    if (!llcId) {
      // Get site address from project details or project name
      const siteAddress = projectData.siteAddress || projectData.name || "New Project";
      
      // Generate LLC name: "DP [Street Name] LLC"
      const streetMatch = siteAddress.match(/^\d+\s+(.+?)(?:,|\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Way|Ct|Court|Pl|Place))?/i);
      const streetName = streetMatch ? streetMatch[1].trim() : siteAddress.split(',')[0].trim();
      const llcName = `DP ${streetName} LLC`;
      
      console.log(`🏢 Auto-generating LLC: ${llcName} for project: ${projectData.name}`);
      
      const llcResult = await pool.query(
        `INSERT INTO llcs (organization_id, name, project_name, project_address, status, state_of_formation)
         VALUES ($1, $2, $3, $4, 'forming', $5)
         ON CONFLICT (name) DO UPDATE SET project_name = EXCLUDED.project_name
         RETURNING id`,
        [
          projectData.organizationId || 1,
          llcName,
          projectData.name,
          siteAddress,
          projectData.state || 'Delaware'
        ]
      );
      
      llcId = llcResult.rows[0].id;
      console.log(`✅ LLC id: ${llcId} for "${llcName}"`);
    }
    
    // Insert project with LLC reference
    const [result] = await db.insert(projects).values({
      ...projectData,
      llcId
    }).returning();
    
    res.json(result);
  } catch (error) {
    console.error("Failed to create project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const updateData = { ...req.body };

    if (updateData.projectNumber) {
      const existing = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.projectNumber, updateData.projectNumber),
            ne(projects.id, projectId)
          )
        );
      if (existing.length > 0) {
        delete updateData.projectNumber;
      }
    }

    const [result] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();
    res.json(result);
  } catch (error) {
    console.error("Failed to update project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await db.delete(projects).where(eq(projects.id, projectId));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// ---------------------------------------------------------------------------
// CLIENTS
// ---------------------------------------------------------------------------

router.get("/projects/:projectId/client", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [client] = await db.select().from(clients).where(eq(clients.projectId, projectId));
    res.json(client || null);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.post("/projects/:projectId/client", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [existing] = await db.select().from(clients).where(eq(clients.projectId, projectId));
    if (existing) {
      const [result] = await db
        .update(clients)
        .set(req.body)
        .where(eq(clients.projectId, projectId))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(clients).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to create/update client:", error);
    res.status(500).json({ error: "Failed to create/update client" });
  }
});

router.patch("/projects/:projectId/client", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [existing] = await db.select().from(clients).where(eq(clients.projectId, projectId));
    if (existing) {
      const [result] = await db
        .update(clients)
        .set(req.body)
        .where(eq(clients.projectId, projectId))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(clients).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to update client:", error);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// ---------------------------------------------------------------------------
// PROJECT DETAILS
// ---------------------------------------------------------------------------

router.get("/projects/:projectId/details", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [details] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
    res.json(details || null);
  } catch (error) {
    console.error("Failed to fetch project details:", error);
    res.status(500).json({ error: "Failed to fetch project details" });
  }
});

router.post("/projects/:projectId/details", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [existing] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
    if (existing) {
      const [result] = await db
        .update(projectDetails)
        .set(req.body)
        .where(eq(projectDetails.projectId, projectId))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(projectDetails).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to update project details:", error);
    res.status(500).json({ error: "Failed to update project details" });
  }
});

// PATCH endpoint for project details (same as POST - upsert behavior)
router.patch("/projects/:projectId/details", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [existing] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
    if (existing) {
      const [result] = await db
        .update(projectDetails)
        .set(req.body)
        .where(eq(projectDetails.projectId, projectId))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(projectDetails).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to update project details:", error);
    res.status(500).json({ error: "Failed to update project details" });
  }
});

// ---------------------------------------------------------------------------
// MILESTONES
// ---------------------------------------------------------------------------

router.get("/projects/:projectId/milestones", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
    res.json(projectMilestones);
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

router.get("/projects/:projectId/milestones/:type", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const milestoneType = req.params.type;
    const projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId));
    const filtered = projectMilestones.filter(m => m.milestoneType === milestoneType);
    res.json(filtered);
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

router.post("/projects/:projectId/milestones", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [result] = await db.insert(milestones).values({ ...req.body, projectId }).returning();
    res.json(result);
  } catch (error) {
    console.error("Failed to create milestone:", error);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

router.patch("/milestones/:id", async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const [result] = await db
      .update(milestones)
      .set(req.body)
      .where(eq(milestones.id, milestoneId))
      .returning();
    res.json(result);
  } catch (error) {
    console.error("Failed to update milestone:", error);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

router.post("/milestones/:id/pay", async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const { paidAmount, invoiceNumber } = req.body;
    
    const [result] = await db
      .update(milestones)
      .set({
        status: "Paid",
        paidDate: new Date().toISOString(),
        paidAmount,
        invoiceNumber,
      })
      .where(eq(milestones.id, milestoneId))
      .returning();
    
    res.json(result);
  } catch (error) {
    console.error("Failed to mark milestone as paid:", error);
    res.status(500).json({ error: "Failed to mark milestone as paid" });
  }
});

router.delete("/milestones/:id", async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    await db.delete(milestones).where(eq(milestones.id, milestoneId));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete milestone:", error);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

router.post("/projects/:projectId/milestones/create-defaults", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { milestoneType } = req.body;
    
    const defaults: Record<string, Array<{ name: string; percentage: number; dueUpon: string }>> = {
      client: [
        { name: "Deposit", percentage: 10, dueUpon: "Contract Execution" },
        { name: "Design Completion", percentage: 15, dueUpon: "Design Approval" },
        { name: "Green Light", percentage: 25, dueUpon: "Green Light Approval" },
        { name: "Production Start", percentage: 20, dueUpon: "Production Commencement" },
        { name: "Delivery", percentage: 20, dueUpon: "Module Delivery" },
        { name: "Final", percentage: 10, dueUpon: "Final Inspection" },
      ],
      manufacturing: [
        { name: "Production Start", percentage: 30, dueUpon: "Production Commencement" },
        { name: "Mid-Production", percentage: 30, dueUpon: "50% Production Complete" },
        { name: "Production Complete", percentage: 30, dueUpon: "Production Complete" },
        { name: "Delivery", percentage: 10, dueUpon: "Module Delivery" },
      ],
      onsite: [
        { name: "Site Prep Start", percentage: 20, dueUpon: "Site Work Commencement" },
        { name: "Foundation Complete", percentage: 25, dueUpon: "Foundation Inspection" },
        { name: "Set Complete", percentage: 25, dueUpon: "Module Set Complete" },
        { name: "Systems Complete", percentage: 20, dueUpon: "MEP Rough Complete" },
        { name: "Final", percentage: 10, dueUpon: "Certificate of Occupancy" },
      ],
    };
    
    const milestonesToCreate = defaults[milestoneType] || [];
    const results = [];
    
    for (let i = 0; i < milestonesToCreate.length; i++) {
      const m = milestonesToCreate[i];
      const [result] = await db.insert(milestones).values({
        projectId,
        milestoneType,
        milestoneNumber: i + 1,
        name: m.name,
        percentage: m.percentage,
        dueUpon: m.dueUpon,
        status: "Pending",
      }).returning();
      results.push(result);
    }
    
    res.json(results);
  } catch (error) {
    console.error("Failed to create default milestones:", error);
    res.status(500).json({ error: "Failed to create default milestones" });
  }
});

// ---------------------------------------------------------------------------
// WARRANTY TERMS
// ---------------------------------------------------------------------------

router.get("/projects/:projectId/warranty-terms", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [warranty] = await db.select().from(warrantyTerms).where(eq(warrantyTerms.projectId, projectId));
    res.json(warranty || null);
  } catch (error) {
    console.error("Failed to fetch warranty terms:", error);
    res.status(500).json({ error: "Failed to fetch warranty terms" });
  }
});

router.patch("/projects/:projectId/warranty-terms", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [existing] = await db.select().from(warrantyTerms).where(eq(warrantyTerms.projectId, projectId));
    if (existing) {
      const [result] = await db
        .update(warrantyTerms)
        .set(req.body)
        .where(eq(warrantyTerms.projectId, projectId))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(warrantyTerms).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to update warranty terms:", error);
    res.status(500).json({ error: "Failed to update warranty terms" });
  }
});

// ---------------------------------------------------------------------------
// CONTRACTORS
// ---------------------------------------------------------------------------

router.get("/projects/:projectId/contractors", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectContractors = await db.select().from(contractors).where(eq(contractors.projectId, projectId));
    res.json(projectContractors);
  } catch (error) {
    console.error("Failed to fetch contractors:", error);
    res.status(500).json({ error: "Failed to fetch contractors" });
  }
});

router.get("/projects/:projectId/contractors/:type", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const contractorType = req.params.type;
    const projectContractors = await db
      .select()
      .from(contractors)
      .where(eq(contractors.projectId, projectId));
    const filtered = projectContractors.filter(c => c.contractorType === contractorType);
    res.json(filtered[0] || null);
  } catch (error) {
    console.error("Failed to fetch contractor:", error);
    res.status(500).json({ error: "Failed to fetch contractor" });
  }
});

router.post("/projects/:projectId/contractors", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { contractorType, ...otherData } = req.body;
    
    const existing = await db
      .select()
      .from(contractors)
      .where(and(
        eq(contractors.projectId, projectId),
        eq(contractors.contractorType, contractorType)
      ));
    
    if (existing.length > 0) {
      const [result] = await db
        .update(contractors)
        .set(otherData)
        .where(eq(contractors.id, existing[0].id))
        .returning();
      res.json(result);
    } else {
      const [result] = await db.insert(contractors).values({ ...req.body, projectId }).returning();
      res.json(result);
    }
  } catch (error) {
    console.error("Failed to create/update contractor:", error);
    res.status(500).json({ error: "Failed to create/update contractor" });
  }
});

router.patch("/contractors/:id", async (req, res) => {
  try {
    const contractorId = parseInt(req.params.id);
    const [result] = await db
      .update(contractors)
      .set(req.body)
      .where(eq(contractors.id, contractorId))
      .returning();
    res.json(result);
  } catch (error) {
    console.error("Failed to update contractor:", error);
    res.status(500).json({ error: "Failed to update contractor" });
  }
});

router.delete("/contractors/:id", async (req, res) => {
  try {
    const contractorId = parseInt(req.params.id);
    await db.delete(contractors).where(eq(contractors.id, contractorId));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contractor:", error);
    res.status(500).json({ error: "Failed to delete contractor" });
  }
});

// ---------------------------------------------------------------------------
// PROJECT UNITS (nested under projects for wizard compatibility)
// ---------------------------------------------------------------------------

router.get('/projects/:projectId/units', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const result = await pool.query(
      `SELECT pu.id, pu.project_id as "projectId", pu.model_id as "modelId", 
              pu.unit_label as "unitLabel", pu.quantity,
              pu.base_price_snapshot as "basePriceSnapshot",
              pu.customization_total as "customizationTotal",
              json_build_object(
                'id', hm.id,
                'name', hm.name,
                'modelCode', hm.model_code,
                'bedrooms', hm.bedrooms,
                'bathrooms', hm.bathrooms,
                'sqFt', hm.sq_ft,
                'designFee', hm.design_fee,
                'offsiteBasePrice', hm.offsite_base_price,
                'onsiteEstPrice', hm.onsite_est_price
              ) as model
       FROM project_units pu
       LEFT JOIN home_models hm ON pu.model_id = hm.id
       WHERE pu.project_id = $1
       ORDER BY pu.unit_label`,
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch project units:", error);
    res.status(500).json({ error: "Failed to fetch project units" });
  }
});

router.post('/projects/:projectId/units', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { modelId, quantity } = req.body;
    
    const modelResult = await pool.query(
      `SELECT * FROM home_models WHERE id = $1`,
      [modelId]
    );
    
    if (modelResult.rows.length === 0) {
      return res.status(404).json({ error: "Home model not found" });
    }
    
    const model = modelResult.rows[0];
    
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM project_units WHERE project_id = $1`,
      [projectId]
    );
    const unitCount = parseInt(countResult.rows[0].count) + 1;
    const unitLabel = `Unit ${String.fromCharCode(64 + unitCount)}`;
    
    const insertResult = await pool.query(
      `INSERT INTO project_units (project_id, model_id, unit_label, quantity, base_price_snapshot, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectId, modelId, unitLabel, quantity || 1, model.offsite_base_price, req.organizationId || 1]
    );
    
    const newUnit = insertResult.rows[0];
    res.status(201).json({
      id: newUnit.id,
      projectId: newUnit.project_id,
      modelId: newUnit.model_id,
      unitLabel: newUnit.unit_label,
      quantity: newUnit.quantity,
      basePriceSnapshot: newUnit.base_price_snapshot,
      customizationTotal: newUnit.customization_total,
      model: {
        id: model.id,
        name: model.name,
        modelCode: model.model_code,
        bedrooms: model.bedrooms,
        bathrooms: model.bathrooms,
        sqFt: model.sq_ft,
        designFee: model.design_fee,
        offsiteBasePrice: model.offsite_base_price,
        onsiteEstPrice: model.onsite_est_price
      }
    });
  } catch (error) {
    console.error("Failed to add unit:", error);
    res.status(500).json({ error: "Failed to add unit" });
  }
});

export default router;
