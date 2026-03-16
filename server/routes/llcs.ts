import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

router.get("/llcs", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        organization_id,
        name,
        project_name as "projectName",
        project_address as "projectAddress",
        status,
        state_of_formation as "stateOfFormation",
        entity_type as "entityType",
        formation_date as "formationDate",
        ein,
        address,
        city,
        state_address as "stateAddress",
        zip,
        registered_agent as "registeredAgent",
        registered_agent_address as "registeredAgentAddress",
        members,
        annual_report_due_date as "annualReportDueDate",
        annual_report_status as "annualReportStatus",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM llcs 
       WHERE organization_id = $1 
       ORDER BY created_at DESC`,
      [req.organizationId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching LLCs:", error);
    res.status(500).json({ error: "Failed to fetch LLCs" });
  }
});

router.get("/llcs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        id,
        organization_id,
        name,
        project_name as "projectName",
        project_address as "projectAddress",
        status,
        state_of_formation as "stateOfFormation",
        entity_type as "entityType",
        formation_date as "formationDate",
        ein,
        address,
        city,
        state_address as "stateAddress",
        zip,
        registered_agent as "registeredAgent",
        registered_agent_address as "registeredAgentAddress",
        members,
        annual_report_due_date as "annualReportDueDate",
        annual_report_status as "annualReportStatus",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM llcs 
       WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "LLC not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching LLC:", error);
    res.status(500).json({ error: "Failed to fetch LLC" });
  }
});

router.post("/llcs", async (req: Request, res: Response) => {
  try {
    const {
      name,
      projectName,
      projectAddress,
      status = "forming",
      stateOfFormation = "Delaware",
      entityType = "LLC",
      formationDate,
      ein,
      einNumber,
      address,
      city,
      stateAddress,
      state,
      zip,
      registeredAgent,
      registeredAgentAddress,
      members,
      annualReportDueDate,
      annualReportStatus = "pending",
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "LLC name is required" });
    }

    const result = await pool.query(
      `INSERT INTO llcs (
        organization_id,
        name,
        project_name,
        project_address,
        status,
        state_of_formation,
        entity_type,
        formation_date,
        ein,
        address,
        city,
        state_address,
        zip,
        registered_agent,
        registered_agent_address,
        members,
        annual_report_due_date,
        annual_report_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (name) DO UPDATE SET
        project_name = COALESCE(EXCLUDED.project_name, llcs.project_name),
        project_address = COALESCE(EXCLUDED.project_address, llcs.project_address),
        updated_at = NOW()
      RETURNING 
        id,
        organization_id,
        name,
        project_name as "projectName",
        project_address as "projectAddress",
        status,
        state_of_formation as "stateOfFormation",
        entity_type as "entityType",
        formation_date as "formationDate",
        ein,
        address,
        city,
        state_address as "stateAddress",
        zip,
        registered_agent as "registeredAgent",
        registered_agent_address as "registeredAgentAddress",
        members,
        annual_report_due_date as "annualReportDueDate",
        annual_report_status as "annualReportStatus",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [
        req.organizationId,
        name,
        projectName || null,
        projectAddress || address || null,
        status,
        stateOfFormation,
        entityType,
        formationDate || null,
        ein || einNumber || null,
        address || projectAddress || null,
        city || null,
        stateAddress || state || null,
        zip || null,
        registeredAgent || null,
        registeredAgentAddress || null,
        members || null,
        annualReportDueDate || null,
        annualReportStatus,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating LLC:", error);
    res.status(500).json({ error: "Failed to create LLC", details: error.message });
  }
});

router.patch("/llcs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fieldMap: Record<string, string> = {
      name: "name",
      projectName: "project_name",
      projectAddress: "project_address",
      status: "status",
      stateOfFormation: "state_of_formation",
      entityType: "entity_type",
      formationDate: "formation_date",
      ein: "ein",
      einNumber: "ein",
      address: "address",
      city: "city",
      stateAddress: "state_address",
      state: "state_address",
      zip: "zip",
      registeredAgent: "registered_agent",
      registeredAgentAddress: "registered_agent_address",
      members: "members",
      annualReportDueDate: "annual_report_due_date",
      annualReportStatus: "annual_report_status",
      isActive: "is_active",
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key];
      if (dbField) {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.organizationId);

    const result = await pool.query(
      `UPDATE llcs 
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING 
        id,
        organization_id,
        name,
        project_name as "projectName",
        project_address as "projectAddress",
        status,
        state_of_formation as "stateOfFormation",
        entity_type as "entityType",
        formation_date as "formationDate",
        ein,
        address,
        city,
        state_address as "stateAddress",
        zip,
        registered_agent as "registeredAgent",
        registered_agent_address as "registeredAgentAddress",
        members,
        annual_report_due_date as "annualReportDueDate",
        annual_report_status as "annualReportStatus",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "LLC not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating LLC:", error);
    res.status(500).json({ error: "Failed to update LLC", details: error.message });
  }
});

router.delete("/llcs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM llcs WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, req.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "LLC not found" });
    }

    res.json({ message: "LLC deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting LLC:", error);
    res.status(500).json({ error: "Failed to delete LLC" });
  }
});

export default router;
