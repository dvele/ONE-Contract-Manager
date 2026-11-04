import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

router.get("/contractor-entities", async (req: Request, res: Response) => {
  try {
    const { contractorType, state } = req.query;
    
    let query = `SELECT * FROM contractor_entities WHERE organization_id = $1 AND is_active = true`;
    const params: any[] = [req.organizationId];
    let paramIdx = 2;
    
    if (contractorType) {
      query += ` AND contractor_type = $${paramIdx}`;
      params.push(contractorType);
      paramIdx++;
    }
    
    if (state) {
      query += ` AND state = $${paramIdx}`;
      params.push(state);
    }
    
    query += ` ORDER BY legal_name`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching contractor entities:", error);
    res.status(500).json({ error: "Failed to fetch contractor entities" });
  }
});

router.get("/contractor-entities/type/:type", async (req: Request, res: Response) => {
  try {
    const contractorType = req.params.type;
    const result = await pool.query(
      `SELECT id, contractor_type as "contractorType", legal_name as "legalName",
              formation_state as "formationState", entity_type as "entityType",
              address, city, state, zip,
              license_number as "licenseNumber", license_state as "licenseState",
              license_expiration as "licenseExpiration",
              contact_name as "contactName", contact_email as "contactEmail",
              contact_phone as "contactPhone",
              bond_amount as "bondAmount", insurance_amount as "insuranceAmount",
              insurance_expiration as "insuranceExpiration", insurance_carrier as "insuranceCarrier",
              insurance_phone as "insurancePhone",
              is_active as "isActive"
       FROM contractor_entities
       WHERE contractor_type = $1 AND is_active = true
       ORDER BY legal_name`,
      [contractorType]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching contractor entities by type:", error);
    res.status(500).json({ error: "Failed to fetch contractor entities" });
  }
});

router.get("/contractor-entities/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM contractor_entities 
       WHERE id = $1 AND organization_id = $2`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contractor entity not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching contractor entity:", error);
    res.status(500).json({ error: "Failed to fetch contractor entity" });
  }
});

router.post("/contractor-entities", async (req: Request, res: Response) => {
  try {
    const { 
      legalName, contractorType, entityType, formationState, state, address, city, zip,
      licenseNumber, licenseState, licenseExpiration, contactName, contactEmail, contactPhone,
      bondAmount, insuranceAmount, insuranceExpiration, insuranceCarrier, insurancePhone
    } = req.body;

    const result = await pool.query(
      `INSERT INTO contractor_entities (
        organization_id, legal_name, contractor_type, entity_type, formation_state, state, address, city, zip,
        license_number, license_state, license_expiration, contact_name, contact_email, contact_phone,
        bond_amount, insurance_amount, insurance_expiration, insurance_carrier, insurance_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id, contractor_type as "contractorType", legal_name as "legalName",
                 formation_state as "formationState", entity_type as "entityType",
                 address, city, state, zip,
                 license_number as "licenseNumber", license_state as "licenseState",
                 license_expiration as "licenseExpiration",
                 contact_name as "contactName", contact_email as "contactEmail",
                 contact_phone as "contactPhone",
                 bond_amount as "bondAmount", insurance_amount as "insuranceAmount",
                 insurance_expiration as "insuranceExpiration", insurance_carrier as "insuranceCarrier",
                 insurance_phone as "insurancePhone",
                 is_active as "isActive"`,
      [
        req.organizationId, legalName, contractorType, entityType, formationState, state, address, city, zip,
        licenseNumber, licenseState, licenseExpiration, contactName, contactEmail, contactPhone,
        bondAmount, insuranceAmount, insuranceExpiration, insuranceCarrier, insurancePhone
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating contractor entity:", error);
    res.status(500).json({ error: "Failed to create contractor entity" });
  }
});

router.patch("/contractor-entities/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      legalName, contractorType, entityType, formationState, state, address, city, zip,
      licenseNumber, licenseState, licenseExpiration, contactName, contactEmail, contactPhone,
      bondAmount, insuranceAmount, insuranceExpiration, insuranceCarrier, insurancePhone, isActive
    } = req.body;

    const result = await pool.query(
      `UPDATE contractor_entities SET
       legal_name = COALESCE($3, legal_name),
       contractor_type = COALESCE($4, contractor_type),
       entity_type = COALESCE($5, entity_type),
       formation_state = COALESCE($6, formation_state),
       state = COALESCE($7, state),
       address = COALESCE($8, address),
       city = COALESCE($9, city),
       zip = COALESCE($10, zip),
       license_number = COALESCE($11, license_number),
       license_state = COALESCE($12, license_state),
       license_expiration = COALESCE($13, license_expiration),
       contact_name = COALESCE($14, contact_name),
       contact_email = COALESCE($15, contact_email),
       contact_phone = COALESCE($16, contact_phone),
       bond_amount = COALESCE($17, bond_amount),
       insurance_amount = COALESCE($18, insurance_amount),
       insurance_expiration = COALESCE($19, insurance_expiration),
       insurance_carrier = COALESCE($20, insurance_carrier),
       insurance_phone = COALESCE($21, insurance_phone),
       is_active = COALESCE($22, is_active),
       updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING id, contractor_type as "contractorType", legal_name as "legalName",
                 formation_state as "formationState", entity_type as "entityType",
                 address, city, state, zip,
                 license_number as "licenseNumber", license_state as "licenseState",
                 license_expiration as "licenseExpiration",
                 contact_name as "contactName", contact_email as "contactEmail",
                 contact_phone as "contactPhone",
                 bond_amount as "bondAmount", insurance_amount as "insuranceAmount",
                 insurance_expiration as "insuranceExpiration", insurance_carrier as "insuranceCarrier",
                 insurance_phone as "insurancePhone",
                 is_active as "isActive"`,
      [
        id, req.organizationId, legalName, contractorType, entityType, formationState, state, address, city, zip,
        licenseNumber, licenseState, licenseExpiration, contactName, contactEmail, contactPhone,
        bondAmount, insuranceAmount, insuranceExpiration, insuranceCarrier, insurancePhone, isActive
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contractor entity not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating contractor entity:", error);
    res.status(500).json({ error: "Failed to update contractor entity" });
  }
});

router.delete("/contractor-entities/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE contractor_entities SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, req.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contractor entity not found" });
    }
    
    res.json({ message: "Contractor entity deactivated" });
  } catch (error: any) {
    console.error("Error deleting contractor entity:", error);
    res.status(500).json({ error: "Failed to delete contractor entity" });
  }
});

export default router;
