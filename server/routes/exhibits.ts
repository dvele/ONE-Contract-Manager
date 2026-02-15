import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

router.get("/exhibits", async (req: Request, res: Response) => {
  try {
    const { contractType, includeInactive } = req.query;
    
    let query = `SELECT * FROM exhibits WHERE organization_id = $1`;
    const params: any[] = [req.organizationId];
    
    if (includeInactive !== "true") {
      query += ` AND is_active = true`;
    }
    
    if (contractType) {
      params.push(contractType);
      query += ` AND contract_types @> ARRAY[$${params.length}]::text[]`;
    }
    
    query += ` ORDER BY sort_order, letter, exhibit_code`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching exhibits:", error);
    res.status(500).json({ error: "Failed to fetch exhibits" });
  }
});

router.get("/exhibits/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM exhibits 
       WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exhibit not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching exhibit:", error);
    res.status(500).json({ error: "Failed to fetch exhibit" });
  }
});

router.post("/exhibits", async (req: Request, res: Response) => {
  try {
    const { letter, title, content, contractTypes, sortOrder, isDynamic, disclosureCode, isActive } = req.body;
    
    const exhibitCode = letter ? `EXHIBIT_${letter}` : req.body.exhibitCode;
    const name = title || req.body.name;
    
    const result = await pool.query(
      `INSERT INTO exhibits (organization_id, exhibit_code, name, letter, title, content, contract_types, sort_order, is_dynamic, disclosure_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.organizationId,
        exhibitCode || '',
        name || '',
        letter || '',
        title || name || '',
        content || '',
        JSON.stringify(contractTypes || []),
        sortOrder || 0,
        isDynamic || false,
        disclosureCode || null,
        isActive !== false
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating exhibit:", error);
    res.status(500).json({ error: "Failed to create exhibit" });
  }
});

router.patch("/exhibits/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { letter, title, content, contractTypes, sortOrder, isDynamic, disclosureCode, isActive } = req.body;
    
    const exhibitCode = letter ? `EXHIBIT_${letter}` : req.body.exhibitCode;
    const name = title || req.body.name;

    const setClauses: string[] = [];
    const params: any[] = [id, req.organizationId];
    let paramIdx = 3;

    const addField = (col: string, val: any) => {
      if (val !== undefined) {
        setClauses.push(`${col} = $${paramIdx}`);
        params.push(val);
        paramIdx++;
      }
    };

    addField('letter', letter);
    addField('title', title || name);
    addField('exhibit_code', exhibitCode);
    addField('name', name || title);
    addField('content', content);
    addField('sort_order', sortOrder);
    addField('is_dynamic', isDynamic);
    addField('disclosure_code', disclosureCode);
    addField('is_active', isActive);

    if (contractTypes !== undefined) {
      setClauses.push(`contract_types = $${paramIdx}`);
      params.push(JSON.stringify(contractTypes));
      paramIdx++;
    }

    setClauses.push('updated_at = NOW()');

    if (setClauses.length === 1) {
      const existing = await pool.query(`SELECT * FROM exhibits WHERE id = $1 AND organization_id = $2`, [id, req.organizationId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Exhibit not found" });
      return res.json(existing.rows[0]);
    }

    const result = await pool.query(
      `UPDATE exhibits SET ${setClauses.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exhibit not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating exhibit:", error);
    res.status(500).json({ error: "Failed to update exhibit" });
  }
});

router.put("/exhibits/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { letter, title, content, contractTypes, sortOrder, isDynamic, disclosureCode, isActive } = req.body;
    
    const exhibitCode = letter ? `EXHIBIT_${letter}` : req.body.exhibitCode;
    const name = title || req.body.name;

    const result = await pool.query(
      `UPDATE exhibits SET 
       letter = COALESCE($3, letter),
       title = COALESCE($4, title),
       exhibit_code = COALESCE($5, exhibit_code),
       name = COALESCE($6, name),
       content = COALESCE($7, content),
       contract_types = COALESCE($8, contract_types),
       sort_order = COALESCE($9, sort_order),
       is_dynamic = COALESCE($10, is_dynamic),
       disclosure_code = $11,
       is_active = COALESCE($12, is_active),
       updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [
        id, req.organizationId,
        letter, title || name, exhibitCode, name || title,
        content,
        contractTypes ? JSON.stringify(contractTypes) : null,
        sortOrder, isDynamic, disclosureCode ?? null, isActive
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exhibit not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating exhibit:", error);
    res.status(500).json({ error: "Failed to update exhibit" });
  }
});

router.delete("/exhibits/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE exhibits SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exhibit not found" });
    }
    
    res.json({ message: "Exhibit deactivated" });
  } catch (error: any) {
    console.error("Error deleting exhibit:", error);
    res.status(500).json({ error: "Failed to delete exhibit" });
  }
});

export default router;
