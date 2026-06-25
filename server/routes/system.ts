import { Router } from "express";
import { db } from "../db/index";
import { pool } from "../db";
import { contracts, financials } from "../../shared/schema";
import { countDistinct } from "drizzle-orm";

const router = Router();

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

router.get("/dashboard/stats", async (req, res) => {
  try {
    const totalPackagesResult = await db
      .select({ count: countDistinct(contracts.projectId) })
      .from(contracts);
    
    const allContracts = await db
      .select({
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        status: contracts.status,
      })
      .from(contracts);
    
    const packagesByProject = new Map<number, { status: string }>();
    allContracts.forEach(c => {
      if (c.projectId && (c.contractType === 'master_ef' || c.contractType === 'one_agreement')) {
        packagesByProject.set(c.projectId, { status: c.status || 'Draft' });
      }
    });
    
    let draftsCount = 0;
    let pendingCount = 0;
    let signedCount = 0;
    
    packagesByProject.forEach(pkg => {
      const status = pkg.status.toLowerCase();
      if (status === 'draft') {
        draftsCount++;
      } else if (status === 'pendingreview' || status === 'pending_review' || status === 'pending') {
        pendingCount++;
      } else if (status === 'executed' || status === 'signed') {
        signedCount++;
      }
    });
    
    // LLC stats temporarily disabled (Phase A refactoring - llcs table removed)
    const pendingLLCsCount = 0;
    
    const activeProjectsCount = packagesByProject.size - draftsCount;
    
    const financialsData = await db.select().from(financials);
    const projectValues = new Map<number, number>();
    financialsData.forEach(f => {
      const value = ((f.designFee || 0) + (f.prelimOffsite || 0) + (f.prelimOnsite || 0)) / 100;
      projectValues.set(f.projectId, value);
    });
    
    let totalValue = 0;
    let draftsValue = 0;
    let pendingValue = 0;
    let signedValue = 0;
    
    packagesByProject.forEach((pkg, projectId) => {
      const value = projectValues.get(projectId) || 0;
      totalValue += value;
      const status = pkg.status.toLowerCase();
      if (status === 'draft') {
        draftsValue += value;
      } else if (status === 'pendingreview' || status === 'pending_review' || status === 'pending') {
        pendingValue += value;
      } else if (status === 'executed' || status === 'signed') {
        signedValue += value;
      }
    });
    
    res.json({
      totalContracts: totalPackagesResult[0]?.count ?? 0,
      drafts: draftsCount,
      pendingReview: pendingCount,
      signed: signedCount,
      pendingLLCs: pendingLLCsCount,
      activeProjects: activeProjectsCount,
      totalContractValue: totalValue,
      draftsValue,
      pendingValue,
      signedValue,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ---------------------------------------------------------------------------
// VARIABLES ENDPOINTS
// ---------------------------------------------------------------------------

router.get("/variables", async (_req, res) => {
  try {
    const { VARIABLE_CATEGORIES, ALL_VARIABLES } = await import("../lib/mapper");
    
    const variables = Object.entries(VARIABLE_CATEGORIES).map(([category, vars]) => ({
      category,
      variables: (vars as string[]).map((name: string) => ({
        name,
        category,
      }))
    }));
    
    res.json({
      categories: variables,
      allVariables: ALL_VARIABLES,
      totalCount: ALL_VARIABLES.length
    });
  } catch (error) {
    console.error("Failed to fetch variables:", error);
    res.status(500).json({ error: "Failed to fetch variables" });
  }
});

// ---------------------------------------------------------------------------
// VARIABLE MAPPINGS API (for Contract Variable Management)
// ---------------------------------------------------------------------------

router.get("/variable-mappings", async (req, res) => {
  try {
    const { search } = req.query;
    const { VARIABLE_CATEGORIES, ALL_VARIABLES } = await import("../lib/mapper");

    const variablesResult = await pool.query(`SELECT * FROM contract_variables ORDER BY category, variable_name`);
    let variables = variablesResult.rows;

    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      variables = variables.filter((v: any) =>
        v.variable_name?.toLowerCase().includes(searchLower) ||
        v.display_name?.toLowerCase().includes(searchLower) ||
        v.category?.toLowerCase().includes(searchLower)
      );
    }

    const clausesResult = await pool.query(`SELECT id, slug, header_text, body_html, contract_types, level FROM clauses WHERE body_html LIKE '%{{%'`);
    const variableToClausesMap: Record<string, any[]> = {};
    for (const clause of clausesResult.rows) {
      const variablePattern = /\{\{([A-Z0-9_]+)\}\}/gi;
      let match;
      while ((match = variablePattern.exec(clause.body_html || '')) !== null) {
        const varName = match[1];
        if (!variableToClausesMap[varName]) variableToClausesMap[varName] = [];
        if (!variableToClausesMap[varName].some((c: any) => c.id === clause.id)) {
          variableToClausesMap[varName].push({
            id: clause.id,
            clauseCode: clause.slug,
            name: clause.header_text,
            contractType: clause.contract_types,
            hierarchyLevel: clause.level,
          });
        }
      }
    }

    const exhibitsResult = await pool.query(`SELECT id, letter, title, content FROM exhibits WHERE content LIKE '%{{%'`);
    const variableToExhibitsMap: Record<string, any[]> = {};
    for (const exhibit of exhibitsResult.rows) {
      const variablePattern = /\{\{([A-Z0-9_]+)\}\}/gi;
      let match;
      while ((match = variablePattern.exec(exhibit.content || '')) !== null) {
        const varName = match[1];
        if (!variableToExhibitsMap[varName]) variableToExhibitsMap[varName] = [];
        if (!variableToExhibitsMap[varName].some((e: any) => e.id === exhibit.id)) {
          variableToExhibitsMap[varName].push({
            id: exhibit.id,
            letter: exhibit.letter,
            title: exhibit.title,
          });
        }
      }
    }

    const componentsResult = await pool.query(`SELECT id, tag_name, content, description, service_model FROM component_library WHERE content LIKE '%{{%'`);
    const variableToComponentsMap: Record<string, any[]> = {};
    for (const comp of componentsResult.rows) {
      const variablePattern = /\{\{([A-Z0-9_]+)\}\}/gi;
      let match;
      while ((match = variablePattern.exec(comp.content || '')) !== null) {
        const varName = match[1];
        if (!variableToComponentsMap[varName]) variableToComponentsMap[varName] = [];
        if (!variableToComponentsMap[varName].some((c: any) => c.id === comp.id)) {
          variableToComponentsMap[varName].push({
            id: comp.id,
            tagName: comp.tag_name,
            description: comp.description,
            serviceModel: comp.service_model,
          });
        }
      }
    }

    const mapperCategoryForVar: Record<string, string> = {};
    for (const [cat, vars] of Object.entries(VARIABLE_CATEGORIES)) {
      for (const v of vars as string[]) {
        mapperCategoryForVar[v] = cat;
      }
    }

    const enrichedVariables = variables.map((v: any) => ({
      id: v.id,
      variableName: v.variable_name,
      displayName: v.display_name,
      category: v.category,
      dataType: v.data_type,
      defaultValue: v.default_value,
      isRequired: v.is_required,
      description: v.description,
      erpSource: v.erp_source,
      usedInContracts: v.used_in_contracts,
      clauseUsage: variableToClausesMap[v.variable_name] || [],
      clauseCount: (variableToClausesMap[v.variable_name] || []).length,
      exhibitUsage: variableToExhibitsMap[v.variable_name] || [],
      exhibitCount: (variableToExhibitsMap[v.variable_name] || []).length,
      componentUsage: variableToComponentsMap[v.variable_name] || [],
      componentCount: (variableToComponentsMap[v.variable_name] || []).length,
      totalUsageCount:
        (variableToClausesMap[v.variable_name] || []).length +
        (variableToExhibitsMap[v.variable_name] || []).length +
        (variableToComponentsMap[v.variable_name] || []).length,
      isRegistered: true,
      mapperCategory: mapperCategoryForVar[v.variable_name] || null,
      inMapper: ALL_VARIABLES.includes(v.variable_name),
    }));

    const registeredVarNames = new Set(variables.map((v: any) => v.variable_name));

    const allDiscoveredVarNames = new Set([
      ...Object.keys(variableToClausesMap),
      ...Object.keys(variableToExhibitsMap),
      ...Object.keys(variableToComponentsMap),
    ]);

    const unregisteredVariables: any[] = [];
    allDiscoveredVarNames.forEach((varName) => {
      if (!registeredVarNames.has(varName)) {
        unregisteredVariables.push({
          id: null,
          variableName: varName,
          displayName: null,
          category: null,
          dataType: 'text',
          defaultValue: null,
          isRequired: false,
          description: null,
          erpSource: null,
          usedInContracts: null,
          clauseUsage: variableToClausesMap[varName] || [],
          clauseCount: (variableToClausesMap[varName] || []).length,
          exhibitUsage: variableToExhibitsMap[varName] || [],
          exhibitCount: (variableToExhibitsMap[varName] || []).length,
          componentUsage: variableToComponentsMap[varName] || [],
          componentCount: (variableToComponentsMap[varName] || []).length,
          totalUsageCount:
            (variableToClausesMap[varName] || []).length +
            (variableToExhibitsMap[varName] || []).length +
            (variableToComponentsMap[varName] || []).length,
          isRegistered: false,
          mapperCategory: mapperCategoryForVar[varName] || null,
          inMapper: ALL_VARIABLES.includes(varName),
        });
      }
    });

    let filteredUnregistered = unregisteredVariables;
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredUnregistered = unregisteredVariables.filter((v: any) =>
        v.variableName.toLowerCase().includes(searchLower)
      );
    }

    const usedVarNames = allDiscoveredVarNames;
    const orphanedMapperVars = ALL_VARIABLES.filter((v: string) => !usedVarNames.has(v) && !registeredVarNames.has(v));

    const stats = {
      totalRegistered: enrichedVariables.length,
      totalUnregistered: unregisteredVariables.length,
      totalInMapper: ALL_VARIABLES.length,
      usedInClauses: Object.keys(variableToClausesMap).length,
      usedInExhibits: Object.keys(variableToExhibitsMap).length,
      usedInComponents: Object.keys(variableToComponentsMap).length,
      orphanedInMapper: orphanedMapperVars.length,
      erpMapped: enrichedVariables.filter((v: any) => v.erpSource).length,
      required: enrichedVariables.filter((v: any) => v.isRequired).length,
    };

    res.json({
      variables: enrichedVariables,
      unregisteredVariables: filteredUnregistered,
      mapperCategories: VARIABLE_CATEGORIES,
      mapperVariableCount: ALL_VARIABLES.length,
      orphanedMapperVars,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch variable mappings:", error);
    res.status(500).json({ error: "Failed to fetch variable mappings" });
  }
});

router.post("/variable-mappings", async (req, res) => {
  try {
    const { variableName, displayName, category, dataType, defaultValue, isRequired, description, erpSource } = req.body;
    
    if (!variableName) {
      return res.status(400).json({ error: "variableName is required" });
    }
    
    const insertQuery = `
      INSERT INTO contract_variables (variable_name, display_name, category, data_type, default_value, is_required, description, erp_source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      variableName,
      displayName || null,
      category || null,
      dataType || 'text',
      defaultValue || null,
      isRequired || false,
      description || null,
      erpSource || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: "Variable name already exists" });
    }
    console.error("Failed to create variable:", error);
    res.status(500).json({ error: "Failed to create variable" });
  }
});

router.patch("/variable-mappings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { variableName, displayName, category, dataType, defaultValue, isRequired, description, erpSource } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (variableName !== undefined) { updates.push(`variable_name = $${paramIndex++}`); values.push(variableName); }
    if (displayName !== undefined) { updates.push(`display_name = $${paramIndex++}`); values.push(displayName); }
    if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
    if (dataType !== undefined) { updates.push(`data_type = $${paramIndex++}`); values.push(dataType); }
    if (defaultValue !== undefined) { updates.push(`default_value = $${paramIndex++}`); values.push(defaultValue); }
    if (isRequired !== undefined) { updates.push(`is_required = $${paramIndex++}`); values.push(isRequired); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (erpSource !== undefined) { updates.push(`erp_source = $${paramIndex++}`); values.push(erpSource); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    values.push(parseInt(id));
    const updateQuery = `
      UPDATE contract_variables
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Variable not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: "Variable name already exists" });
    }
    console.error("Failed to update variable:", error);
    res.status(500).json({ error: "Failed to update variable" });
  }
});

router.delete("/variable-mappings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteQuery = `DELETE FROM contract_variables WHERE id = $1 RETURNING *`;
    const result = await pool.query(deleteQuery, [parseInt(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Variable not found" });
    }
    
    res.json({ message: "Variable deleted successfully", deleted: result.rows[0] });
  } catch (error) {
    console.error("Failed to delete variable:", error);
    res.status(500).json({ error: "Failed to delete variable" });
  }
});

router.post("/system/sync-variables-from-mapper", async (req, res) => {
  try {
    const { VARIABLE_CATEGORIES } = await import("../lib/mapper");

    let created = 0;
    let skipped = 0;

    for (const [category, vars] of Object.entries(VARIABLE_CATEGORIES)) {
      for (const varName of vars as string[]) {
        const existing = await pool.query(
          `SELECT id FROM contract_variables WHERE variable_name = $1`,
          [varName]
        );

        if (existing.rows.length === 0) {
          let dataType = 'text';
          if (varName.endsWith('_WRITTEN') || varName.includes('PRICE') || varName.includes('FEE') || varName.includes('AMOUNT') || varName.includes('COST')) dataType = 'currency';
          else if (varName.endsWith('_DATE')) dataType = 'date';
          else if (varName.startsWith('IS_') || varName.startsWith('HAS_')) dataType = 'boolean';
          else if (varName.endsWith('_MONTHS') || varName.endsWith('_YEARS') || varName.endsWith('_DAYS') || varName.endsWith('_PERCENT') || varName.includes('COUNT') || varName.includes('UNITS')) dataType = 'number';
          else if (varName.endsWith('_TABLE')) dataType = 'text';

          const displayName = varName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase())
            .replace(/Llc/g, 'LLC')
            .replace(/Mep/g, 'MEP')
            .replace(/Gc/g, 'GC')
            .replace(/Sq Ft/g, 'Sq Ft');

          await pool.query(
            `INSERT INTO contract_variables (variable_name, display_name, category, data_type, organization_id) VALUES ($1, $2, $3, $4, 1)`,
            [varName, displayName, category, dataType]
          );
          created++;
        } else {
          skipped++;
        }
      }
    }

    res.json({ created, skipped, total: created + skipped });
  } catch (error) {
    console.error("Failed to sync variables from mapper:", error);
    res.status(500).json({ error: "Failed to sync variables" });
  }
});


export default router;
