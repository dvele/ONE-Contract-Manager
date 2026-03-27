import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth, requireAdmin } from "../middleware/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

router.get("/contract-templates", async (req: Request, res: Response) => {
  try {
    const { contractType } = req.query;
    
    let query = `SELECT * FROM contract_templates WHERE organization_id = $1 AND is_active = true`;
    const params: any[] = [req.organizationId];
    
    if (contractType) {
      query += ` AND contract_type = $2`;
      params.push(contractType);
    }
    
    query += ` ORDER BY name`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching contract templates:", error);
    res.status(500).json({ error: "Failed to fetch contract templates" });
  }
});

router.get("/contract-templates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM contract_templates 
       WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contract template not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching contract template:", error);
    res.status(500).json({ error: "Failed to fetch contract template" });
  }
});

router.post("/contract-templates", async (req: Request, res: Response) => {
  try {
    const { name, contractType, version, content } = req.body;
    
    const result = await pool.query(
      `INSERT INTO contract_templates (organization_id, name, display_name, contract_type, version, content)
       VALUES ($1, $2, $2, $3, $4, $5)
       RETURNING *`,
      [req.organizationId, name, contractType, version, content]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating contract template:", error);
    res.status(500).json({ error: "Failed to create contract template" });
  }
});

router.patch("/contract-templates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contractType, version, content, isActive } = req.body;
    
    const result = await pool.query(
      `UPDATE contract_templates SET 
       name = COALESCE($3, name),
       contract_type = COALESCE($4, contract_type),
       version = COALESCE($5, version),
       content = COALESCE($6, content),
       is_active = COALESCE($7, is_active),
       updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, req.organizationId, name, contractType, version, content, isActive]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contract template not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating contract template:", error);
    res.status(500).json({ error: "Failed to update contract template" });
  }
});

router.delete("/contract-templates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE contract_templates SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contract template not found" });
    }
    
    res.json({ message: "Contract template deactivated" });
  } catch (error: any) {
    console.error("Error deleting contract template:", error);
    res.status(500).json({ error: "Failed to delete contract template" });
  }
});

// =============================================================================
// TEMPLATE CLAUSES
// =============================================================================

router.get("/contract-templates/:id/clauses", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT tc.id, tc.clause_id, tc.order_index,
              c.slug, c.header_text, c.body_html, c.level, c.parent_id AS parent_clause_id
       FROM template_clauses tc
       JOIN clauses c ON c.id = tc.clause_id
       WHERE tc.template_id = $1 AND tc.organization_id = $2
       ORDER BY tc.order_index ASC`,
      [id, req.organizationId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching template clauses:", error);
    res.status(500).json({ error: "Failed to fetch template clauses" });
  }
});

// Adds the clause AND all its descendants to the template
router.post("/contract-templates/:id/clauses", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clauseId } = req.body;

    const maxResult = await pool.query(
      `SELECT COALESCE(MAX(order_index), 0) AS max FROM template_clauses WHERE template_id = $1`,
      [id]
    );
    let orderIndex = maxResult.rows[0].max + 10;

    // Fetch the clause and all its descendants in tree order
    const descendantsResult = await pool.query(
      `WITH RECURSIVE tree AS (
         SELECT id, parent_id, "order" FROM clauses WHERE id = $1
         UNION ALL
         SELECT c.id, c.parent_id, c."order" FROM clauses c JOIN tree t ON c.parent_id = t.id
       )
       SELECT id FROM tree ORDER BY "order"`,
      [clauseId]
    );

    for (const row of descendantsResult.rows) {
      await pool.query(
        `INSERT INTO template_clauses (template_id, clause_id, order_index, organization_id)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [id, row.id, orderIndex++, req.organizationId]
      );
    }

    res.status(201).json({ message: "Clause and children added" });
  } catch (error: any) {
    console.error("Error adding template clause:", error);
    res.status(500).json({ error: "Failed to add clause to template" });
  }
});

// Removes the clause AND all its descendants from the template
router.delete("/contract-templates/:id/clauses/:clauseId", async (req: Request, res: Response) => {
  try {
    const { id, clauseId } = req.params;
    await pool.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM clauses WHERE id = $1
         UNION ALL
         SELECT c.id FROM clauses c JOIN tree t ON c.parent_id = t.id
       )
       DELETE FROM template_clauses
       WHERE template_id = $2 AND organization_id = $3 AND clause_id IN (SELECT id FROM tree)`,
      [clauseId, id, req.organizationId]
    );
    res.json({ message: "Clause and children removed from template" });
  } catch (error: any) {
    console.error("Error removing template clause:", error);
    res.status(500).json({ error: "Failed to remove clause from template" });
  }
});

router.put("/contract-templates/:id/clauses/reorder", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { order }: { order: { clauseId: number; orderIndex: number }[] } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of order) {
        await client.query(
          `UPDATE template_clauses SET order_index = $1
           WHERE template_id = $2 AND clause_id = $3 AND organization_id = $4`,
          [item.orderIndex, id, item.clauseId, req.organizationId]
        );
      }
      // Keep base_clause_ids in sync
      await client.query(
        `UPDATE contract_templates
         SET base_clause_ids = (
           SELECT jsonb_agg(clause_id ORDER BY order_index)
           FROM template_clauses WHERE template_id = $1
         ), updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    res.json({ message: "Clauses reordered" });
  } catch (error: any) {
    console.error("Error reordering template clauses:", error);
    res.status(500).json({ error: "Failed to reorder clauses" });
  }
});

// =============================================================================
// TEMPLATE EXHIBITS
// =============================================================================

router.get("/contract-templates/:id/exhibits", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT te.id, te.exhibit_id, te.order_index,
              e.letter, e.title, e.content, e.is_dynamic, e.disclosure_code
       FROM template_exhibits te
       JOIN exhibits e ON e.id = te.exhibit_id
       WHERE te.template_id = $1 AND te.organization_id = $2
       ORDER BY te.order_index ASC`,
      [id, req.organizationId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching template exhibits:", error);
    res.status(500).json({ error: "Failed to fetch template exhibits" });
  }
});

router.post("/contract-templates/:id/exhibits", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exhibitId } = req.body;

    const maxResult = await pool.query(
      `SELECT COALESCE(MAX(order_index), 0) AS max FROM template_exhibits WHERE template_id = $1`,
      [id]
    );
    const orderIndex = maxResult.rows[0].max + 10;

    const result = await pool.query(
      `INSERT INTO template_exhibits (template_id, exhibit_id, order_index, organization_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, exhibitId, orderIndex, req.organizationId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error adding template exhibit:", error);
    res.status(500).json({ error: "Failed to add exhibit to template" });
  }
});

router.delete("/contract-templates/:id/exhibits/:exhibitId", async (req: Request, res: Response) => {
  try {
    const { id, exhibitId } = req.params;
    await pool.query(
      `DELETE FROM template_exhibits WHERE template_id = $1 AND exhibit_id = $2 AND organization_id = $3`,
      [id, exhibitId, req.organizationId]
    );
    res.json({ message: "Exhibit removed from template" });
  } catch (error: any) {
    console.error("Error removing template exhibit:", error);
    res.status(500).json({ error: "Failed to remove exhibit from template" });
  }
});

router.put("/contract-templates/:id/exhibits/reorder", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { order }: { order: { exhibitId: number; orderIndex: number }[] } = req.body;

    for (const item of order) {
      await pool.query(
        `UPDATE template_exhibits SET order_index = $1
         WHERE template_id = $2 AND exhibit_id = $3 AND organization_id = $4`,
        [item.orderIndex, id, item.exhibitId, req.organizationId]
      );
    }
    res.json({ message: "Exhibits reordered" });
  } catch (error: any) {
    console.error("Error reordering template exhibits:", error);
    res.status(500).json({ error: "Failed to reorder exhibits" });
  }
});

// Bump version counter — called by template editor Save
router.patch("/:id/version", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id as string);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template id" });
    }

    const result = await pool.query(
      `UPDATE contract_templates
       SET version = version + 1, updated_at = now()
       WHERE id = $1 AND organization_id = $2
       RETURNING version`,
      [templateId, req.organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ version: result.rows[0].version });
  } catch (error: any) {
    console.error("Error updating template version:", error);
    res.status(500).json({ error: "Failed to update template version" });
  }
});

export default router;
