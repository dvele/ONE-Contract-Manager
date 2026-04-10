import { Router } from "express";
import { db } from "../db/index";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { contracts, projects, clauses, financials, projectUnits, homeModels, contractTemplates } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { getProjectWithRelations } from "./helpers";
import path from "path";
import fs from "fs";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
// @ts-ignore - mammoth doesn't have type declarations
import mammoth from "mammoth";

const execAsync = promisify(exec);

const router = Router();

// Configure multer for template uploads
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const templatesDir = path.join(process.cwd(), "server", "templates");
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    cb(null, templatesDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename: remove special chars, keep only alphanumeric, underscores, hyphens
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .replace(/_+/g, "_");
    cb(null, safeName);
  },
});

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.originalname.endsWith(".docx")) {
      cb(null, true);
    } else {
      cb(new Error("Only .docx files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// ---------------------------------------------------------------------------
// TEMPLATE UPLOAD & INGESTION
// ---------------------------------------------------------------------------

router.post("/contracts/upload-template", templateUpload.single("template"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const objectType = req.body.objectType || "contract";
    
    console.log(`\n📤 Template uploaded: ${fileName}`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Object type: ${objectType}`);
    
    try {
      let itemsCreated = 0;
      
      if (objectType === "exhibit") {
        // Process as Exhibit Library
        itemsCreated = await ingestExhibitsFromDocument(filePath);
        
        res.json({
          success: true,
          message: `Successfully ingested ${itemsCreated} exhibits`,
          objectType: "exhibit",
          itemsCreated,
          fileName,
        });
        
      } else if (objectType === "state_disclosure") {
        // Process as State Disclosure Library
        itemsCreated = await ingestStateDisclosuresFromDocument(filePath);
        
        res.json({
          success: true,
          message: `Successfully ingested ${itemsCreated} state disclosures`,
          objectType: "state_disclosure",
          itemsCreated,
          fileName,
        });
        
      } else {
        // Default: Process as Contract Agreement (clauses)
        const contractType = fileName
          .replace(/\.docx$/i, "")
          .replace(/^Template[_-]?/i, "")
          .replace(/[_-]/g, "_")
          .toUpperCase()
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        
        console.log(`   Contract type: ${contractType}`);
        console.log(`\n🔄 Running ingestion script for: ${filePath}`);
        
        const { stdout, stderr } = await execAsync(
          `npx tsx scripts/ingest_standard_contracts.ts "${filePath}"`,
          { cwd: process.cwd(), timeout: 120000 }
        );
        
        console.log("Ingestion output:", stdout);
        if (stderr) console.error("Ingestion stderr:", stderr);
        
        // Count the blocks created for this contract type
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(clauses)
          .where(sql`${clauses.contractTypes} @> ${JSON.stringify([contractType])}`);

        
        itemsCreated = countResult[0]?.count || 0;
        
        res.json({
          success: true,
          message: `Successfully ingested ${itemsCreated} clauses`,
          objectType: "contract",
          contractType,
          itemsCreated,
          blocksCreated: itemsCreated, // Backwards compatibility
          fileName,
        });
      }
      
    } catch (execError: any) {
      console.error("Ingestion failed:", execError);
      
      // Clean up the uploaded file on failure
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(500).json({
        error: "Ingestion failed",
        message: execError.message || "Failed to process template",
        stdout: execError.stdout,
        stderr: execError.stderr,
      });
    }
    
  } catch (error: any) {
    console.error("Template upload failed:", error);
    res.status(500).json({ 
      error: "Upload failed", 
      message: error.message || "Failed to upload template" 
    });
  }
});

// ---------------------------------------------------------------------------
// INLINE INGESTION FUNCTIONS
// ---------------------------------------------------------------------------

// Pattern for prefix stripping (removes manual numbers like "1.1.", "a.", "i.", etc.)
const PREFIX_STRIP_PATTERN = /^(\d+(\.\d+)*|[a-z]\.|[ivx]+\.)\s+/i;
// Pattern to detect notes to ignore (paragraphs starting with !!!!)
const IGNORE_NOTES_PATTERN = /^!!!!.*/;
// Pattern for exhibit headers
const EXHIBIT_HEADER_PATTERN = /^EXHIBIT\s+([A-Z])[\s:.\-]+(.+)?$/i;
// State patterns for disclosure parsing
const STATE_HEADER_PATTERNS = [
  { pattern: /^CALIFORNIA\b/i, code: "CA" },
  { pattern: /^TEXAS\b/i, code: "TX" },
  { pattern: /^ARIZONA\b/i, code: "AZ" },
  { pattern: /^NEVADA\b/i, code: "NV" },
  { pattern: /^OREGON\b/i, code: "OR" },
  { pattern: /^WASHINGTON\b/i, code: "WA" },
  { pattern: /^COLORADO\b/i, code: "CO" },
  { pattern: /^FLORIDA\b/i, code: "FL" },
  { pattern: /^NEW\s+YORK\b/i, code: "NY" },
  { pattern: /^IDAHO\b/i, code: "ID" },
  { pattern: /^UTAH\b/i, code: "UT" },
  { pattern: /^MONTANA\b/i, code: "MT" },
  { pattern: /^NORTH\s+CAROLINA\b/i, code: "NC" },
  { pattern: /^SOUTH\s+CAROLINA\b/i, code: "SC" },
  { pattern: /^GEORGIA\b/i, code: "GA" },
  { pattern: /^TENNESSEE\b/i, code: "TN" },
];

function stripPrefix(text: string): string {
  return text.replace(PREFIX_STRIP_PATTERN, "").trim();
}

function shouldIgnoreParagraph(text: string): boolean {
  return IGNORE_NOTES_PATTERN.test(text.trim());
}

function extractTextFromElement(element: any): string {
  if (element.type === "text") {
    return element.value || "";
  }
  if (element.children) {
    return element.children.map((child: any) => extractTextFromElement(child)).join("");
  }
  return "";
}

function getHtmlTagForLevel(level: number): { open: string; close: string } {
  switch (level) {
    case 1: return { open: '<h2 class="exhibit-section-1">', close: "</h2>" };
    case 2: return { open: '<h3 class="exhibit-section-2">', close: "</h3>" };
    case 3: return { open: '<h4 class="exhibit-clause">', close: "</h4>" };
    case 4: return { open: '<h5 class="exhibit-subheader">', close: "</h5>" };
    case 5: return { open: '<p class="exhibit-body">', close: "</p>" };
    case 6: return { open: '<p class="exhibit-conspicuous"><strong>', close: "</strong></p>" };
    case 7: return { open: '<li class="exhibit-list-item">', close: "</li>" };
    default: return { open: "<p>", close: "</p>" };
  }
}

function determineLevel(styleName: string, text: string): number {
  const normalized = styleName.toLowerCase().trim();
  
  // Roman numeral list items
  if (/^(i{1,3}|iv|vi{0,3}|ix|x{0,3})\.?\s+/i.test(text)) {
    return 7;
  }
  
  if (normalized.includes("heading 1") || normalized === "heading1" || normalized === "title") return 1;
  if (normalized.includes("heading 2") || normalized === "heading2") return 2;
  if (normalized.includes("heading 3") || normalized === "heading3") return 3;
  if (normalized.includes("heading 4") || normalized === "heading4") return 4;
  if (normalized.includes("heading 5") || normalized === "heading5") return 7;
  if (normalized.includes("heading 6") || normalized === "heading6") return 6;
  
  return 5;
}

async function ingestExhibitsFromDocument(filePath: string): Promise<number> {
  console.log(`\n📑 Ingesting Exhibits from: ${filePath}`);
  
  interface StyledParagraph {
    style: string;
    text: string;
  }
  
  const styledParagraphs: StyledParagraph[] = [];
  
  await mammoth.convertToHtml(
    { path: filePath },
    {
      transformDocument: (document: any) => {
        const stack: any[] = [document];
        while (stack.length > 0) {
          const node = stack.shift();
          if (node.type === "paragraph") {
            const styleName = node.styleName || "Normal";
            const textContent = extractTextFromElement(node);
            if (textContent.trim() && !shouldIgnoreParagraph(textContent)) {
              styledParagraphs.push({
                style: styleName,
                text: stripPrefix(textContent.trim()),
              });
            }
          }
          if (node.children) {
            stack.push(...node.children);
          }
        }
        return document;
      },
    }
  );
  
  console.log(`   Found ${styledParagraphs.length} paragraphs`);
  
  // Parse exhibits
  interface ParsedExhibit {
    letter: string;
    title: string;
    content: string;
    isDynamic: boolean;
    disclosureCode: string | null;
    contractTypes: string[];
    sortOrder: number;
  }
  
  const exhibitsList: ParsedExhibit[] = [];
  let currentExhibit: ParsedExhibit | null = null;
  let contentBuilder: string[] = [];
  let inListContext = false;
  let sortOrder = 1;
  
  for (const para of styledParagraphs) {
    const headerMatch = para.text.match(EXHIBIT_HEADER_PATTERN);
    
    if (headerMatch) {
      // Save previous exhibit
      if (currentExhibit) {
        if (inListContext) {
          contentBuilder.push("</ul>");
          inListContext = false;
        }
        currentExhibit.content = contentBuilder.join("\n");
        currentExhibit.isDynamic = currentExhibit.letter === "G" || currentExhibit.letter === "H" ||
          currentExhibit.title.toLowerCase().includes("state") ||
          currentExhibit.content.includes("[STATE_DISCLOSURE:");
        if (currentExhibit.content.includes("[STATE_DISCLOSURE:")) {
          const codeMatch = currentExhibit.content.match(/\[STATE_DISCLOSURE:([A-Z0-9_]+)\]/);
          currentExhibit.disclosureCode = codeMatch ? codeMatch[1] : null;
        }
        exhibitsList.push(currentExhibit);
      }
      
      const letter = headerMatch[1].toUpperCase();
      const title = (headerMatch[2] || "").trim().replace(/^[:.\-\s]+/, "").trim();
      
      currentExhibit = {
        letter,
        title: title || `Exhibit ${letter}`,
        content: "",
        isDynamic: false,
        disclosureCode: null,
        contractTypes: ["ONE", "MANUFACTURING", "ONSITE"],
        sortOrder: sortOrder++,
      };
      contentBuilder = [];
      inListContext = false;
      
      console.log(`   Found Exhibit ${letter}: ${title}`);
      continue;
    }
    
    if (currentExhibit) {
      const level = determineLevel(para.style, para.text);
      const tags = getHtmlTagForLevel(level);
      
      if (level === 7) {
        if (!inListContext) {
          contentBuilder.push('<ul class="exhibit-roman-list">');
          inListContext = true;
        }
        contentBuilder.push(`${tags.open}${para.text}${tags.close}`);
      } else {
        if (inListContext) {
          contentBuilder.push("</ul>");
          inListContext = false;
        }
        contentBuilder.push(`${tags.open}${para.text}${tags.close}`);
      }
    }
  }
  
  // Don't forget the last exhibit
  if (currentExhibit) {
    if (inListContext) {
      contentBuilder.push("</ul>");
    }
    currentExhibit.content = contentBuilder.join("\n");
    currentExhibit.isDynamic = currentExhibit.letter === "G" || currentExhibit.letter === "H" ||
      currentExhibit.title.toLowerCase().includes("state") ||
      currentExhibit.content.includes("[STATE_DISCLOSURE:");
    exhibitsList.push(currentExhibit);
  }
  
  if (exhibitsList.length === 0) {
    console.log("   No exhibits found in document");
    return 0;
  }
  
  // TODO: Exhibits table temporarily removed in Phase A refactoring
  // This functionality will be restored when exhibits table is re-added
  console.log(`   ⚠️ Exhibit ingestion temporarily disabled (Phase A refactoring)`);
  console.log(`   Found ${exhibitsList.length} exhibits but table is not available`);
  return 0;
}

async function ingestStateDisclosuresFromDocument(filePath: string): Promise<number> {
  console.log(`\n📑 Ingesting State Disclosures from: ${filePath}`);
  
  interface StyledParagraph {
    style: string;
    text: string;
  }
  
  const styledParagraphs: StyledParagraph[] = [];
  
  await mammoth.convertToHtml(
    { path: filePath },
    {
      transformDocument: (document: any) => {
        const stack: any[] = [document];
        while (stack.length > 0) {
          const node = stack.shift();
          if (node.type === "paragraph") {
            const styleName = node.styleName || "Normal";
            const textContent = extractTextFromElement(node);
            if (textContent.trim() && !shouldIgnoreParagraph(textContent)) {
              styledParagraphs.push({
                style: styleName,
                text: stripPrefix(textContent.trim()),
              });
            }
          }
          if (node.children) {
            stack.push(...node.children);
          }
        }
        return document;
      },
    }
  );
  
  console.log(`   Found ${styledParagraphs.length} paragraphs`);
  
  // Parse state disclosures - split on state headers
  interface ParsedDisclosure {
    code: string;
    state: string;
    content: string;
  }
  
  const disclosuresList: ParsedDisclosure[] = [];
  let currentState: string | null = null;
  let contentBuilder: string[] = [];
  const defaultCode = "EXHIBIT_G_CONTENT";
  
  function detectStateFromText(text: string): string | null {
    for (const { pattern, code } of STATE_HEADER_PATTERNS) {
      if (pattern.test(text)) {
        return code;
      }
    }
    return null;
  }
  
  for (const para of styledParagraphs) {
    const detectedState = detectStateFromText(para.text);
    
    if (detectedState) {
      // Save previous state disclosure
      if (currentState && contentBuilder.length > 0) {
        disclosuresList.push({
          code: defaultCode,
          state: currentState,
          content: contentBuilder.join("\n"),
        });
      }
      
      currentState = detectedState;
      contentBuilder = [];
      console.log(`   Found state section: ${detectedState}`);
      continue;
    }
    
    if (currentState) {
      const level = determineLevel(para.style, para.text);
      const tags = getHtmlTagForLevel(level);
      contentBuilder.push(`${tags.open}${para.text}${tags.close}`);
    }
  }
  
  // Don't forget the last state
  if (currentState && contentBuilder.length > 0) {
    disclosuresList.push({
      code: defaultCode,
      state: currentState,
      content: contentBuilder.join("\n"),
    });
  }
  
  if (disclosuresList.length === 0) {
    console.log("   No state disclosures found in document");
    return 0;
  }
  
  // Insert or update state disclosures
  let insertedCount = 0;
  for (const disclosure of disclosuresList) {
    try {
      await pool.query(
        `INSERT INTO state_disclosures (state, code, content, organization_id)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (state, code) DO UPDATE SET content = $3, updated_at = NOW()`,
        [disclosure.state, disclosure.code, disclosure.content]
      );
      console.log(`   ✓ Saved ${disclosure.code} for ${disclosure.state} (${disclosure.content.length} chars)`);
      insertedCount++;
    } catch (err) {
      console.error(`   ✗ Failed to save ${disclosure.code} for ${disclosure.state}:`, err);
    }
  }
  
  console.log(`   Inserted/updated ${insertedCount} state disclosures`);
  return insertedCount;
}

// Delete a template
router.delete("/contracts/templates/:fileName", async (req, res) => {
  try {
    const rawFileName = req.params.fileName;
    const templatesDir = path.join(process.cwd(), "server", "templates");
    
    // Security: Sanitize fileName to prevent path traversal attacks
    // Only allow the base filename, reject any path components
    const fileName = path.basename(rawFileName);
    
    // Validate it's a .docx file
    if (!fileName.endsWith(".docx")) {
      return res.status(400).json({ error: "Invalid file type. Only .docx files can be deleted." });
    }
    
    // Validate against existing templates (allowlist approach)
    const existingFiles = fs.existsSync(templatesDir) 
      ? fs.readdirSync(templatesDir).filter(f => f.endsWith(".docx") && !f.startsWith("~$"))
      : [];
    
    if (!existingFiles.includes(fileName)) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const filePath = path.join(templatesDir, fileName);
    
    // Double-check the resolved path is within templatesDir (defense in depth)
    const resolvedPath = path.resolve(filePath);
    const resolvedTemplatesDir = path.resolve(templatesDir);
    if (!resolvedPath.startsWith(resolvedTemplatesDir)) {
      return res.status(400).json({ error: "Invalid file path" });
    }
    
    // Derive contract type
    const contractType = fileName
      .replace(/\.docx$/i, "")
      .replace(/^Template[_-]?/i, "")
      .replace(/[_-]/g, "_")
      .toUpperCase()
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    // Delete associated clauses that have this contract type in their array
    await pool.query(`
      DELETE FROM clauses 
      WHERE contract_types @> $1::jsonb
    `, [JSON.stringify([contractType])]);
    
    res.json({ 
      success: true, 
      message: `Template "${fileName}" and its clauses deleted`,
      contractType 
    });
    
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// ---------------------------------------------------------------------------
// CONTRACT CRUD
// ---------------------------------------------------------------------------

router.get("/contracts/templates", async (req, res) => {
  try {
    const templatesDir = path.join(process.cwd(), "server", "templates");

    if (!fs.existsSync(templatesDir)) {
      return res.json({ templates: [] });
    }

    const files = fs.readdirSync(templatesDir).filter(
      (f) => f.endsWith(".docx") && !f.startsWith("~$")
    );

    const templates = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(templatesDir, fileName);
        const stats = fs.statSync(filePath);

        const contractType = fileName
          .replace(/\.docx$/i, "")
          .replace(/^Template[_-]?/i, "")
          .replace(/[_-]/g, "_")
          .toUpperCase()
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");

        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(clauses)
          .where(sql`${clauses.contractTypes} @> ${JSON.stringify([contractType])}`);

        return {
          fileName,
          contractType,
          uploadedAt: stats.mtime.toISOString(),
          size: stats.size,
          clauseCount: countResult[0]?.count || 0,
        };
      })
    );

    res.json({ templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.get("/projects/:projectId/contracts", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.projectId, projectId));
    res.json(projectContracts);
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// ---------------------------------------------------------------------------
// CONTRACT CRUD
// ---------------------------------------------------------------------------

router.get("/contracts", async (req, res) => {
  try {
    const allContracts = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
        currentTemplateVersion: contractTemplates.version,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .leftJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
      .orderBy(contracts.generatedAt);
    
    const draftProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        projectNumber: projects.projectNumber,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.status, 'Draft'));
    
    const financialsData = await db.select().from(financials);
    const projectValues = new Map<number, number>();
    financialsData.forEach(f => {
      const value = ((f.designFee || 0) + (f.prelimOffsite || 0) + (f.prelimOnsite || 0)) / 100;
      projectValues.set(f.projectId, value);
    });
    
    const normalizeStatus = (status: string | null): string => {
      if (!status) return 'draft';
      const normalized = status.toLowerCase().replace(/\s+/g, '_');
      const statusMap: Record<string, string> = {
        'draft': 'draft',
        'pendingreview': 'pending_review',
        'pending_review': 'pending_review',
        'pending': 'pending_review',
        'approved': 'approved',
        'signed': 'signed',
        'executed': 'signed',
        'expired': 'expired',
      };
      return statusMap[normalized] || 'draft';
    };
    
    const packageMap = new Map<number, {
      packageId: number;
      projectId: number;
      projectName: string;
      projectNumber: string;
      status: string;
      contractValue: number;
      generatedAt: string;
      isDraft: boolean;
      contracts: Array<{
        id: number;
        contractType: string;
        fileName: string;
        status: string;
        generatedAt: string;
        templateVersion: number | null;
        currentTemplateVersion: number | null;
      }>;
    }>();
    
    const projectsWithContracts = new Set(allContracts.map(c => c.projectId));
    draftProjects.forEach(p => {
      if (!projectsWithContracts.has(p.id)) {
        packageMap.set(p.id, {
          packageId: p.id,
          projectId: p.id,
          projectName: p.name || 'Untitled Draft',
          projectNumber: p.projectNumber || '',
          status: 'draft',
          contractValue: projectValues.get(p.id) || 0,
          generatedAt: p.createdAt?.toISOString() || '',
          isDraft: true,
          contracts: [],
        });
      }
    });
    
    allContracts.forEach(c => {
      if (!c.projectId) return;
      
      const existing = packageMap.get(c.projectId);
      const contractInfo = {
        id: c.id,
        contractType: c.contractType || '',
        fileName: c.fileName || '',
        status: normalizeStatus(c.status),
        generatedAt: c.generatedAt?.toISOString() || '',
        templateVersion: c.templateVersion ?? null,
        currentTemplateVersion: c.currentTemplateVersion ?? null,
      };
      
      if (existing) {
        existing.contracts.push(contractInfo);
        existing.isDraft = false;
        if (c.contractType === 'one_agreement') {
          existing.status = normalizeStatus(c.status);
        }
      } else {
        packageMap.set(c.projectId, {
          packageId: c.projectId,
          projectId: c.projectId,
          projectName: c.projectName || 'Unknown Project',
          projectNumber: c.projectNumber || '',
          status: normalizeStatus(c.status),
          contractValue: projectValues.get(c.projectId) || 0,
          generatedAt: c.generatedAt?.toISOString() || '',
          isDraft: false,
          contracts: [contractInfo],
        });
      }
    });
    
    const packages = Array.from(packageMap.values()).map(pkg => ({
      ...pkg,
      title: `${pkg.projectName} Contract Package`,
      clientName: pkg.projectName,
      contractCount: pkg.contracts.length,
    }));
    
    packages.sort((a, b) => {
      if (a.isDraft && !b.isDraft) return -1;
      if (!a.isDraft && b.isDraft) return 1;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
    
    res.json(packages);
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

router.post("/contracts", async (req, res) => {
  try {
    const { projectId, contractType, status, templateId } = req.body;
    
    // Validation: Require templateId
    if (!templateId) {
      console.log("❌ POST /contracts failed: Missing templateId");
      return res.status(400).json({ error: "Missing templateId" });
    }
    
    console.log("🚀 STARTING GENERATION. TemplateID:", templateId, "ProjectID:", projectId, "ContractType:", contractType);

    // Normalize status to ensure consistency
    const normalizedStatus = status === "draft" ? "Draft" : status;
    const contractData = { ...req.body, status: normalizedStatus };

    const client = await pool.connect();
    try {
      // Fetch current template version for snapshot
      const templateVersionResult = await client.query(
        `SELECT version FROM contract_templates WHERE id = $1 AND organization_id = $2`,
        [templateId, req.organizationId]
      );
      const templateVersionAtGeneration: number | null =
        templateVersionResult.rows[0]?.version ?? null;

      // Fetch playlist from template_clauses
      const playlistResult = await client.query(
        `SELECT tc.*, c.header_text, c.body_html, c.level 
         FROM template_clauses tc
         JOIN clauses c ON c.id = tc.clause_id
         WHERE tc.template_id = $1 
         ORDER BY tc.order_index ASC`,
        [templateId]
      );
      
      console.log("📋 Found", playlistResult.rows.length, "entries in template_clauses for template", templateId);
      
      // Guard clause: Template must have clauses
      if (playlistResult.rows.length === 0) {
        console.log("❌ Template is empty. No clauses found for template ID:", templateId);
        return res.status(400).json({ 
          error: "Template is empty. Please re-import the template.",
          templateId 
        });
      }
      
      await client.query('BEGIN');
      
      // Delete existing drafts for same project/type (version control)
      if (projectId && contractType && normalizedStatus === "Draft") {
        // First, find existing drafts
        const findResult = await client.query(
          `SELECT id FROM contracts 
           WHERE project_id = $1 AND contract_type = $2 AND status = 'Draft'`,
          [projectId, contractType]
        );
        
        if (findResult.rowCount && findResult.rowCount > 0) {
          console.log(`🔄 Version control: Replacing ${findResult.rowCount} existing draft(s) for project ${projectId}, type ${contractType}`);
          // Delete contract_clauses FIRST (child records)
          for (const row of findResult.rows) {
            await client.query('DELETE FROM contract_clauses WHERE contract_id = $1', [row.id]);
          }
          // Then delete the contracts (parent records)
          await client.query(
            `DELETE FROM contracts 
             WHERE project_id = $1 AND contract_type = $2 AND status = 'Draft'`,
            [projectId, contractType]
          );
        }
      }
      
      // Insert new contract
      const insertResult = await client.query(
        `INSERT INTO contracts (project_id, contract_type, version, status, generated_at, generated_by, template_id, template_version, file_path, file_name, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          contractData.projectId,
          contractData.contractType,
          contractData.version || 1,
          contractData.status || 'Draft',
          contractData.generatedAt || new Date(),
          contractData.generatedBy || null,
          templateId,
          templateVersionAtGeneration,
          contractData.filePath || null,
          contractData.fileName || null,
          contractData.notes || null
        ]
      );
      
      const newContract = insertResult.rows[0];
      
      // Insert clauses into contract_clauses from the playlist
      for (const row of playlistResult.rows) {
        await client.query(
          `INSERT INTO contract_clauses (contract_id, clause_id, header_text, body_html, level, "order")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newContract.id,
            row.clause_id,
            row.header_text,
            row.body_html,
            row.level,
            row.order_index
          ]
        );
      }
      
      await client.query('COMMIT');
      
      console.log("✅ SUCCESS. Inserted", playlistResult.rows.length, "clauses into contract", newContract.id);
      
      // Return contract with clause count
      res.json({
        ...newContract,
        clauseCount: playlistResult.rows.length
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Failed to create contract:", error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

router.get("/contracts/:id", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const [contract] = await db
      .select({
        id: contracts.id,
        projectId: contracts.projectId,
        contractType: contracts.contractType,
        version: contracts.version,
        status: contracts.status,
        generatedAt: contracts.generatedAt,
        generatedBy: contracts.generatedBy,
        templateId: contracts.templateId,
        templateVersion: contracts.templateVersion,
        fileName: contracts.fileName,
        filePath: contracts.filePath,
        notes: contracts.notes,
        projectName: projects.name,
        projectNumber: projects.projectNumber,
        currentTemplateVersion: contractTemplates.version,
      })
      .from(contracts)
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .leftJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
      .where(eq(contracts.id, contractId));
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json(contract);
  } catch (error) {
    console.error("Failed to fetch contract:", error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

router.get("/contracts/:id/clauses", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    const hydratedQuery = `
      SELECT cc.id, cc.clause_id, cc.header_text, cc.body_html, cc.level, cc."order",
             c.slug, c.contract_types, c.tags
      FROM contract_clauses cc
      LEFT JOIN clauses c ON c.id = cc.clause_id
      WHERE cc.contract_id = $1
      ORDER BY cc."order" ASC
    `;

    let result = await pool.query(hydratedQuery, [contractId]);

    if (result.rows.length === 0) {
      const contractTypeMap: Record<string, string> = {
        'one_agreement': 'ONE_AGREEMENT', 'ONE': 'ONE_AGREEMENT',
        'ONE Agreement': 'ONE_AGREEMENT', 'ONE_AGREEMENT': 'ONE_AGREEMENT',
        'manufacturing_sub': 'OFFSITE', 'MANUFACTURING': 'OFFSITE', 'OFFSITE': 'OFFSITE',
        'onsite_sub': 'ON_SITE', 'ONSITE': 'ON_SITE', 'ON_SITE': 'ON_SITE',
      };
      const templateType = contractTypeMap[contract.contractType] || 'ONE_AGREEMENT';
      result = await pool.query(
        `SELECT c.id, c.slug, c.header_text, c.body_html, c.level, c."order", c.contract_types, c.tags
         FROM clauses c
         WHERE c.contract_types @> $1::jsonb OR c.contract_types @> '["ALL"]'::jsonb
         ORDER BY c."order", c.slug`,
        [JSON.stringify([templateType])]
      );
    }

    let variables: Record<string, string | number | boolean | null> = {};
    if (contract.projectId) {
      const projectData = await getProjectWithRelations(contract.projectId);
      if (projectData) {
        const { mapProjectToVariables } = await import('../lib/mapper');
        const { calculateProjectPricing } = await import('../services/pricingEngine');
        let pricingSummary = null;
        try {
          pricingSummary = await calculateProjectPricing(contract.projectId);
        } catch (e) {
          console.warn('Pricing calculation failed for clause preview:', e);
        }
        variables = mapProjectToVariables(projectData, pricingSummary || undefined);
      }
    }

    const clausesWithValues = result.rows.map((clause: any) => {
      const replaceVars = (text: string) =>
        text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match: string, varName: string) => {
          const value = variables[varName];
          return value !== null && value !== undefined && value !== '' ? String(value) : _match;
        });

      const headerText = replaceVars(clause.header_text || '');
      const bodyHtml = replaceVars(clause.body_html || '');

      return {
        id: clause.id,
        clause_code: clause.slug,
        section_number: clause.slug,
        name: headerText,
        header_text: headerText,
        body_html: bodyHtml,
        content: `<div class="clause-wrapper level-${clause.level}"><h4 class="clause-header">${headerText}</h4><div class="clause-body">${bodyHtml}</div></div>`,
        hierarchy_level: clause.level,
        contract_types: clause.contract_types,
        tags: clause.tags,
      };
    });

    res.json(clausesWithValues);
  } catch (error) {
    console.error("Failed to fetch contract clauses:", error);
    res.status(500).json({ error: "Failed to fetch clauses" });
  }
});

router.patch("/contracts/:id", async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const [result] = await db
      .update(contracts)
      .set(req.body)
      .where(eq(contracts.id, contractId))
      .returning();
    res.json(result);
  } catch (error) {
    console.error("Failed to update contract:", error);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

router.post("/contracts/:id/regenerate", requireAuth, async (req, res) => {
  const contractId = parseInt(req.params.id as string, 10);
  if (isNaN(contractId)) {
    return res.status(400).json({ error: "Invalid contract id" });
  }

  const client = await pool.connect();
  try {
    // 1. Fetch the contract to get templateId
    // Note: contracts.organization_id is nullable (not set at INSERT time), so we
    // rely on the contract ID alone — matching the pattern of GET /contracts/:id.
    const contractResult = await client.query(
      `SELECT id, template_id, project_id, contract_type
       FROM contracts
       WHERE id = $1`,
      [contractId]
    );
    if (contractResult.rowCount === 0) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = contractResult.rows[0];

    if (!contract.template_id) {
      return res.status(400).json({ error: "Contract has no linked template" });
    }

    await client.query("BEGIN");

    // 2. Fetch the template's current version
    const templateResult = await client.query(
      `SELECT version FROM contract_templates
       WHERE id = $1 AND organization_id = $2`,
      [contract.template_id, req.organizationId]
    );
    if (templateResult.rowCount === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    const currentVersion: number = templateResult.rows[0].version;

    // 3. Fetch the template's current clause playlist
    const playlistResult = await client.query(
      `SELECT tc.clause_id, tc.order_index, c.header_text, c.body_html, c.level
       FROM template_clauses tc
       JOIN clauses c ON c.id = tc.clause_id
       WHERE tc.template_id = $1
       ORDER BY tc.order_index ASC`,
      [contract.template_id]
    );
    if (playlistResult.rowCount === 0) {
      return res.status(400).json({ error: "Template has no clauses" });
    }

    // 4. Replace clause snapshot
    await client.query(
      `DELETE FROM contract_clauses WHERE contract_id = $1`,
      [contractId]
    );
    for (const row of playlistResult.rows) {
      await client.query(
        `INSERT INTO contract_clauses (contract_id, clause_id, header_text, body_html, level, "order")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contractId, row.clause_id, row.header_text, row.body_html, row.level, row.order_index]
      );
    }

    // 5. Update contract metadata
    const updateResult = await client.query(
      `UPDATE contracts
       SET template_version = $1, generated_at = now()
       WHERE id = $2
       RETURNING *`,
      [currentVersion, contractId]
    );

    await client.query("COMMIT");

    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to regenerate contract:", err);
    res.status(500).json({ error: "Failed to regenerate contract" });
  } finally {
    client.release();
  }
});

router.post("/contracts/download-all-zip", async (req, res) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    
    const fullProject = await getProjectWithRelations(projectId);
    if (!fullProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const { mapProjectToVariables, formatCentsAsCurrency, centsToDollars } = await import('../lib/mapper');
    const { calculateProjectPricing } = await import('../services/pricingEngine');
    
    // Calculate pricing FIRST so we can pass it to mapProjectToVariables
    let pricingSummary: any = null;
    try {
      pricingSummary = await calculateProjectPricing(projectId);
      console.log(`✓ Pricing calculated for ZIP: contractValue=${pricingSummary.contractValue}, paymentSchedule=${pricingSummary.paymentSchedule?.length || 0} items`);
    } catch (pricingError) {
      console.warn(`⚠️ Pricing engine error (using fallback):`, pricingError);
    }
    
    // Now call mapProjectToVariables WITH the pricingSummary so tables are populated
    const projectData = mapProjectToVariables(fullProject, pricingSummary || undefined);
    
    console.log(`\n=== Generating ALL contracts as ZIP for project ${projectId} ===`);
    console.log(`Project: ${projectData.PROJECT_NUMBER} - ${projectData.PROJECT_NAME}`);
    
    try {
      const projectUnitsData = await db
        .select({
          unitLabel: projectUnits.unitLabel,
          modelName: homeModels.name,
        })
        .from(projectUnits)
        .innerJoin(homeModels, eq(projectUnits.modelId, homeModels.id))
        .where(eq(projectUnits.projectId, projectId));
      
      if (pricingSummary && pricingSummary.unitCount > 0) {
        projectData.DESIGN_FEE = centsToDollars(pricingSummary.breakdown.totalDesignFee);
        projectData.DESIGN_FEE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalDesignFee);
        projectData.PRELIM_OFFSITE = centsToDollars(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIM_OFFSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIMINARY_OFFSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.deliveryInstallationPrice = centsToDollars(pricingSummary.breakdown.totalShipping);
        projectData.PRELIM_ONSITE = centsToDollars(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIM_ONSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIMINARY_ONSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
        projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
        projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        
        pricingSummary.paymentSchedule.forEach((milestone: { name: string; percentage: number; amount: number; phase?: string }, index: number) => {
          const num = index + 1;
          projectData[`MILESTONE_${num}_NAME`] = milestone.name;
          projectData[`MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
          projectData[`MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
          projectData[`MILESTONE_${num}_PHASE`] = milestone.phase || null;
          projectData[`CLIENT_MILESTONE_${num}_NAME`] = milestone.name;
          projectData[`CLIENT_MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
          projectData[`CLIENT_MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
          
          if (milestone.name === 'Retainage' || milestone.name.toLowerCase().includes('retainage')) {
            projectData.RETAINAGE_PERCENT = `${milestone.percentage}%`;
            projectData.RETAINAGE_AMOUNT = formatCentsAsCurrency(milestone.amount);
          }
        });
        
        const unitCounts: Record<string, { count: number; labels: string[] }> = {};
        projectUnitsData.forEach(unit => {
          if (!unitCounts[unit.modelName]) {
            unitCounts[unit.modelName] = { count: 0, labels: [] };
          }
          unitCounts[unit.modelName].count++;
          unitCounts[unit.modelName].labels.push(unit.unitLabel ?? "");
        });

        const unitSummaryParts = Object.entries(unitCounts).map(([model, data]) =>
          `${data.count}x ${model} (${data.labels.join(', ')})`
        );
        const unitSummary = `${pricingSummary.unitCount} Unit${pricingSummary.unitCount !== 1 ? 's' : ''}: ${unitSummaryParts.join(', ')}`;
        
        projectData.HOME_MODEL = unitSummary;
        projectData.UNIT_MODEL_LIST = pricingSummary.unitModelSummary || unitSummary;
        projectData.TOTAL_UNITS = pricingSummary.unitCount;
        
        projectData.TOTAL_PROJECT_BUDGET = centsToDollars(pricingSummary.projectBudget);
        projectData.TOTAL_PROJECT_BUDGET_WRITTEN = formatCentsAsCurrency(pricingSummary.projectBudget);
        projectData.TOTAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.TOTAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRICING_SERVICE_MODEL = pricingSummary.serviceModel;
        
        projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        
        console.log(`Pricing Engine injected: Contract Value = ${formatCentsAsCurrency(pricingSummary.contractValue)}, Project Budget = ${formatCentsAsCurrency(pricingSummary.projectBudget)}, Service Model = ${pricingSummary.serviceModel}, Units = ${pricingSummary.unitCount}`);
      }
    } catch (pricingError) {
      console.warn('Pricing engine calculation failed, using legacy values:', pricingError);
    }
    
    const { generateContract, getContractFilename } = await import('../lib/contractGenerator');
    const archiver = (await import('archiver')).default;
    
    const projectContractType = ((fullProject as any).contractType || (fullProject as any).contract_type || 'MASTER_EF').toUpperCase();
    const contractTypes: string[] = projectContractType === 'MASTER_EF' 
      ? ['MASTER_EF'] 
      : ['ONE', 'MANUFACTURING', 'ONSITE'];
    
    console.log(`Contract type for project: ${projectContractType}, generating: ${contractTypes.join(', ')}`);
    
    const generatedContracts: Array<{ buffer: Buffer; filename: string }> = [];
    
    for (const contractType of contractTypes) {
      try {
        const contractFilterType = contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF';
        const contractProjectData = contractTypes.length === 1
          ? projectData
          : mapProjectToVariables(fullProject, pricingSummary || undefined, contractFilterType);
        
        const buffer = await generateContract({
          contractType: contractFilterType,
          projectData: contractProjectData,
          format: 'pdf'
        });
        const filename = getContractFilename(contractType, contractProjectData, 'pdf');
        generatedContracts.push({ buffer, filename });
        console.log(`Generated ${contractType}: ${filename} (${buffer.length} bytes)`);
      } catch (err) {
        console.error(`Failed to generate ${contractType}:`, err);
      }
    }
    
    if (generatedContracts.length === 0) {
      return res.status(500).json({ error: "Failed to generate any contracts" });
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Format: ProjectNumber_ProjectName.zip
    const projectNumber = (projectData.PROJECT_NUMBER || 'Contracts').toString().replace(/[^a-z0-9-]/gi, '_');
    const projectName = (projectData.PROJECT_NAME || '').toString().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_');
    const zipFilename = projectName ? `${projectNumber}_${projectName}.zip` : `${projectNumber}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
    archive.pipe(res);
    
    for (const contract of generatedContracts) {
      archive.append(contract.buffer, { name: contract.filename });
    }
    
    await archive.finalize();
    
    console.log(`ZIP archive created with ${generatedContracts.length} contracts`);
    
  } catch (error) {
    console.error("Error generating ZIP:", error);
    res.status(500).json({ 
      error: "Failed to generate contract package",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/contracts/download-pdf", async (req, res) => {
  try {
    const { contractType, projectId, projectData: legacyProjectData } = req.body;
    
    if (!contractType) {
      return res.status(400).json({ error: "contractType is required" });
    }
    
    let projectData: any;
    
    if (projectId) {
      const fullProject = await getProjectWithRelations(projectId);
      if (!fullProject) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const { mapProjectToVariables, formatCentsAsCurrency, centsToDollars } = await import('../lib/mapper');
      const { calculateProjectPricing } = await import('../services/pricingEngine');
      
      // Calculate pricing FIRST so we can pass it to mapProjectToVariables
      let pricingSummary: any = null;
      try {
        pricingSummary = await calculateProjectPricing(projectId);
        console.log(`✓ Pricing calculated for PDF: contractValue=${pricingSummary.contractValue}, paymentSchedule=${pricingSummary.paymentSchedule?.length || 0} items`);
      } catch (pricingError) {
        console.warn(`⚠️ Pricing engine error (using fallback):`, pricingError);
      }
      
      // Now call mapProjectToVariables WITH the pricingSummary and contractType so tables are filtered correctly
      // Contract type filtering: ONE shows all, MANUFACTURING shows offsite only, ONSITE shows onsite only
      const contractFilterType = contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF';
      projectData = mapProjectToVariables(fullProject, pricingSummary || undefined, contractFilterType);
      
      console.log(`\n=== Generating ${contractType} contract for project ${projectId} ===`);
      console.log(`Project: ${projectData.PROJECT_NUMBER} - ${projectData.PROJECT_NAME}`);
      console.log(`Service Model: ${projectData.ON_SITE_SELECTION}`);
      
      try {
        const projectUnitsData = await db
          .select({
            unitLabel: projectUnits.unitLabel,
            modelName: homeModels.name,
          })
          .from(projectUnits)
          .innerJoin(homeModels, eq(projectUnits.modelId, homeModels.id))
          .where(eq(projectUnits.projectId, projectId));
        
        if (pricingSummary && pricingSummary.unitCount > 0) {
          projectData.DESIGN_FEE = centsToDollars(pricingSummary.breakdown.totalDesignFee);
          projectData.DESIGN_FEE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalDesignFee);
          projectData.PRELIM_OFFSITE = centsToDollars(pricingSummary.breakdown.totalOffsite);
          projectData.PRELIM_OFFSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
          projectData.PRELIMINARY_OFFSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
          projectData.deliveryInstallationPrice = centsToDollars(pricingSummary.breakdown.totalShipping);
          projectData.PRELIM_ONSITE = centsToDollars(pricingSummary.breakdown.totalOnsite);
          projectData.PRELIM_ONSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
          projectData.PRELIMINARY_ONSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
          projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
          projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
          projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
          projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
          projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
          projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
          projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
          
          pricingSummary.paymentSchedule.forEach((milestone: { name: string; percentage: number; amount: number; phase?: string }, index: number) => {
            const num = index + 1;
            projectData[`MILESTONE_${num}_NAME`] = milestone.name;
            projectData[`MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
            projectData[`MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
            projectData[`MILESTONE_${num}_PHASE`] = milestone.phase;
            projectData[`CLIENT_MILESTONE_${num}_NAME`] = milestone.name;
            projectData[`CLIENT_MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
            projectData[`CLIENT_MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
            
            if (milestone.name === 'Retainage' || milestone.name.toLowerCase().includes('retainage')) {
              projectData.RETAINAGE_PERCENT = `${milestone.percentage}%`;
              projectData.RETAINAGE_AMOUNT = formatCentsAsCurrency(milestone.amount);
            }
          });
          
          const unitCounts: Record<string, { count: number; labels: string[] }> = {};
          projectUnitsData.forEach(unit => {
            if (!unitCounts[unit.modelName]) {
              unitCounts[unit.modelName] = { count: 0, labels: [] };
            }
            unitCounts[unit.modelName].count++;
            unitCounts[unit.modelName].labels.push(unit.unitLabel ?? "");
          });
          
          const unitSummaryParts = Object.entries(unitCounts).map(([model, data]) => 
            `${data.count}x ${model} (${data.labels.join(', ')})`
          );
          const unitSummary = `${pricingSummary.unitCount} Unit${pricingSummary.unitCount !== 1 ? 's' : ''}: ${unitSummaryParts.join(', ')}`;
          
          projectData.HOME_MODEL = unitSummary;
          projectData.UNIT_MODEL_LIST = pricingSummary.unitModelSummary || unitSummary;
          projectData.TOTAL_UNITS = pricingSummary.unitCount;
          
          projectData.TOTAL_PROJECT_BUDGET = centsToDollars(pricingSummary.projectBudget);
          projectData.TOTAL_PROJECT_BUDGET_WRITTEN = formatCentsAsCurrency(pricingSummary.projectBudget);
          projectData.TOTAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
          projectData.TOTAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
          projectData.PRICING_SERVICE_MODEL = pricingSummary.serviceModel;
          
          projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
          projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
          projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
          projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
          projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
          projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
          projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
          
          console.log(`Pricing Engine injected: Contract Value = ${formatCentsAsCurrency(pricingSummary.contractValue)}, Project Budget = ${formatCentsAsCurrency(pricingSummary.projectBudget)}, Service Model = ${pricingSummary.serviceModel}, Units = ${pricingSummary.unitCount}`);
        }
      } catch (pricingError) {
        console.warn('Pricing engine calculation failed, using legacy values:', pricingError);
      }
    } else if (legacyProjectData) {
      // LEGACY MODE IS NO LONGER SUPPORTED - Reject with clear error
      // All callers must use projectId to ensure proper variable mapping
      return res.status(400).json({ 
        error: "Legacy projectData input is no longer supported",
        message: "Please use 'projectId' instead of 'projectData'. The standard flow requires: projectId → getProjectWithRelations() → mapProjectToVariables() → generateContract()",
        action: "Update your API call to use { projectId: <number>, contractType: <string> }"
      });
    } else {
      return res.status(400).json({ error: "Either projectId or projectData is required" });
    }

    const { generateContract, getContractFilename } = await import('../lib/contractGenerator');
    
    const buffer = await generateContract({
      contractType: contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF',
      projectData,
      format: 'pdf'
    });

    const filename = getContractFilename(contractType, projectData, 'pdf');
    
    console.log(`Generated ${contractType} contract: ${buffer.length} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ 
      error: "Failed to generate document",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET endpoint for mobile-friendly PDF download (browser navigates directly)
router.get("/contracts/download-pdf/:projectId/:contractType", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const contractType = req.params.contractType;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: "Valid projectId is required" });
    }
    if (!contractType) {
      return res.status(400).json({ error: "contractType is required" });
    }

    const fullProject = await getProjectWithRelations(projectId);
    if (!fullProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { mapProjectToVariables, formatCentsAsCurrency, centsToDollars } = await import('../lib/mapper');
    const { calculateProjectPricing } = await import('../services/pricingEngine');

    let pricingSummary: any = null;
    try {
      pricingSummary = await calculateProjectPricing(projectId);
    } catch (pricingError) {
      console.warn(`⚠️ Pricing engine error (using fallback):`, pricingError);
    }

    const contractFilterType = contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF';
    const projectData = mapProjectToVariables(fullProject, pricingSummary || undefined, contractFilterType);

    try {
      const projectUnitsData = await db
        .select({
          unitLabel: projectUnits.unitLabel,
          modelName: homeModels.name,
        })
        .from(projectUnits)
        .innerJoin(homeModels, eq(projectUnits.modelId, homeModels.id))
        .where(eq(projectUnits.projectId, projectId));

      if (pricingSummary && pricingSummary.unitCount > 0) {
        projectData.DESIGN_FEE = centsToDollars(pricingSummary.breakdown.totalDesignFee);
        projectData.DESIGN_FEE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalDesignFee);
        projectData.PRELIM_OFFSITE = centsToDollars(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIM_OFFSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIMINARY_OFFSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.deliveryInstallationPrice = centsToDollars(pricingSummary.breakdown.totalShipping);
        projectData.PRELIM_ONSITE = centsToDollars(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIM_ONSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIMINARY_ONSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.TOTAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.TOTAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.TOTAL_PROJECT_BUDGET = centsToDollars(pricingSummary.projectBudget);
        projectData.TOTAL_PROJECT_BUDGET_WRITTEN = formatCentsAsCurrency(pricingSummary.projectBudget);

        pricingSummary.paymentSchedule.forEach((milestone: { name: string; percentage: number; amount: number; phase?: string }, index: number) => {
          const num = index + 1;
          projectData[`MILESTONE_${num}_NAME`] = milestone.name;
          projectData[`MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
          projectData[`MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
          projectData[`MILESTONE_${num}_PHASE`] = milestone.phase ?? null;
        });

        const unitCounts: Record<string, { count: number; labels: string[] }> = {};
        projectUnitsData.forEach(unit => {
          if (!unitCounts[unit.modelName]) {
            unitCounts[unit.modelName] = { count: 0, labels: [] };
          }
          unitCounts[unit.modelName].count++;
          unitCounts[unit.modelName].labels.push(unit.unitLabel ?? "");
        });
        const unitSummaryParts = Object.entries(unitCounts).map(([model, data]) =>
          `${data.count}x ${model} (${data.labels.join(', ')})`
        );
        projectData.HOME_MODEL = `${pricingSummary.unitCount} Unit${pricingSummary.unitCount !== 1 ? 's' : ''}: ${unitSummaryParts.join(', ')}`;
        projectData.UNIT_MODEL_LIST = pricingSummary.unitModelSummary || projectData.HOME_MODEL;
        projectData.TOTAL_UNITS = pricingSummary.unitCount;
        projectData.PRICING_SERVICE_MODEL = pricingSummary.serviceModel;
      }
    } catch (pricingError) {
      console.warn('Pricing enrichment failed for GET download:', pricingError);
    }

    // Look up the saved contract to use its clause snapshot and templateId.
    // This ensures edits to the clause/exhibit libraries never cascade into
    // an already-generated contract.
    const savedContract = await pool.query(
      `SELECT id, template_id FROM contracts
       WHERE project_id = $1 AND UPPER(contract_type) = UPPER($2)
       ORDER BY generated_at DESC LIMIT 1`,
      [projectId, contractType]
    );

    let snapshotClauses: any[] | undefined;
    let templateId: number | undefined;

    if (savedContract.rows.length > 0) {
      const saved = savedContract.rows[0];
      templateId = saved.template_id ?? undefined;

      const snapshotResult = await pool.query(
        `SELECT cc.clause_id AS id, c.slug AS clause_code, cc.header_text AS name,
                cc.body_html AS content, c.contract_types, cc.level AS hierarchy_level,
                cc."order" AS sort_order, c.tags
         FROM contract_clauses cc
         LEFT JOIN clauses c ON c.id = cc.clause_id
         WHERE cc.contract_id = $1
         ORDER BY cc."order" ASC`,
        [saved.id]
      );
      if (snapshotResult.rows.length > 0) {
        snapshotClauses = snapshotResult.rows.map((r: any) => ({
          id: r.id,
          clause_code: r.clause_code || '',
          name: r.name || '',
          content: r.content || '',
          contract_type: Array.isArray(r.contract_types) ? r.contract_types[0] : r.contract_types,
          hierarchy_level: r.hierarchy_level,
          sort_order: r.sort_order,
          parent_clause_id: null,
          conditions: null,
          block_type: null,
          disclosure_code: null,
          category: '',
          variables_used: [],
          service_model_condition: null,
        }));
        console.log(`📄 Using clause snapshot (${snapshotClauses.length} clauses) from contract ${saved.id}`);
      }
    }

    const { generateContract, getContractFilename } = await import('../lib/contractGenerator');

    const buffer = await generateContract({
      contractType: contractFilterType,
      projectData,
      format: 'pdf',
      snapshotClauses,
      templateId,
    });

    const filename = getContractFilename(contractType, projectData, 'pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);

  } catch (error) {
    console.error("Error generating PDF (GET):", error);
    res.status(500).send('Failed to generate PDF. Please try again.');
  }
});

// Draft Preview - Generate HTML preview of contract without PDF conversion
// Uses the same data enrichment as the PDF route to ensure parity
router.post("/contracts/draft-preview", async (req, res) => {
  try {
    const { contractType, projectId } = req.body;
    
    if (!contractType) {
      return res.status(400).json({ error: "contractType is required" });
    }
    
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required for draft preview" });
    }
    
    // Get full project data
    const fullProject = await getProjectWithRelations(projectId);
    if (!fullProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const { mapProjectToVariables, formatCentsAsCurrency, centsToDollars } = await import('../lib/mapper');
    const { calculateProjectPricing } = await import('../services/pricingEngine');
    
    // Calculate pricing FIRST (same as PDF route)
    let pricingSummary: any = null;
    try {
      pricingSummary = await calculateProjectPricing(projectId);
      console.log(`✓ Pricing calculated for preview: contractValue=${pricingSummary.contractValue}, paymentSchedule=${pricingSummary.paymentSchedule?.length || 0} items`);
    } catch (pricingError) {
      console.warn(`⚠️ Pricing engine error (using fallback):`, pricingError);
    }
    
    // Map project to variables WITH pricingSummary and contractType (same as PDF route)
    // Contract type filtering: ONE shows all, MANUFACTURING shows offsite only, ONSITE shows onsite only
    const contractFilterType = contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF';
    const projectData = mapProjectToVariables(fullProject, pricingSummary || undefined, contractFilterType);
    
    console.log(`\n=== Generating ${contractType} DRAFT PREVIEW for project ${projectId} ===`);
    console.log(`Project: ${projectData.PROJECT_NUMBER} - ${projectData.PROJECT_NAME}`);
    console.log(`Service Model: ${projectData.ON_SITE_SELECTION}`);
    
    // Apply the same pricing/milestone/unit enrichment as PDF route
    try {
      const projectUnitsData = await db
        .select({
          unitLabel: projectUnits.unitLabel,
          modelName: homeModels.name,
        })
        .from(projectUnits)
        .innerJoin(homeModels, eq(projectUnits.modelId, homeModels.id))
        .where(eq(projectUnits.projectId, projectId));
      
      if (pricingSummary && pricingSummary.unitCount > 0) {
        projectData.DESIGN_FEE = centsToDollars(pricingSummary.breakdown.totalDesignFee);
        projectData.DESIGN_FEE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalDesignFee);
        projectData.PRELIM_OFFSITE = centsToDollars(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIM_OFFSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.PRELIMINARY_OFFSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOffsite);
        projectData.deliveryInstallationPrice = centsToDollars(pricingSummary.breakdown.totalShipping);
        projectData.PRELIM_ONSITE = centsToDollars(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIM_ONSITE_WRITTEN = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIMINARY_ONSITE_PRICE = formatCentsAsCurrency(pricingSummary.breakdown.totalOnsite);
        projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
        projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.grandTotal);
        projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.grandTotal);
        projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.grandTotal);
        
        pricingSummary.paymentSchedule.forEach((milestone: { name: string; percentage: number; amount: number; phase?: string }, index: number) => {
          const num = index + 1;
          projectData[`MILESTONE_${num}_NAME`] = milestone.name;
          projectData[`MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
          projectData[`MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
          projectData[`MILESTONE_${num}_PHASE`] = milestone.phase || '';
          projectData[`CLIENT_MILESTONE_${num}_NAME`] = milestone.name;
          projectData[`CLIENT_MILESTONE_${num}_PERCENT`] = `${milestone.percentage}%`;
          projectData[`CLIENT_MILESTONE_${num}_AMOUNT`] = formatCentsAsCurrency(milestone.amount);
          
          if (milestone.name === 'Retainage' || milestone.name.toLowerCase().includes('retainage')) {
            projectData.RETAINAGE_PERCENT = `${milestone.percentage}%`;
            projectData.RETAINAGE_AMOUNT = formatCentsAsCurrency(milestone.amount);
          }
        });
        
        const unitCounts: Record<string, { count: number; labels: string[] }> = {};
        projectUnitsData.forEach((unit: { unitLabel: string | null; modelName: string }) => {
          if (!unitCounts[unit.modelName]) {
            unitCounts[unit.modelName] = { count: 0, labels: [] };
          }
          unitCounts[unit.modelName].count++;
          unitCounts[unit.modelName].labels.push(unit.unitLabel);
        });
        
        const unitSummaryParts = Object.entries(unitCounts).map(([model, data]) => 
          `${data.count}x ${model} (${data.labels.join(', ')})`
        );
        const unitSummary = `${pricingSummary.unitCount} Unit${pricingSummary.unitCount !== 1 ? 's' : ''}: ${unitSummaryParts.join(', ')}`;
        
        projectData.HOME_MODEL = unitSummary;
        projectData.UNIT_MODEL_LIST = pricingSummary.unitModelSummary || unitSummary;
        projectData.TOTAL_UNITS = pricingSummary.unitCount;
        
        projectData.TOTAL_PROJECT_BUDGET = centsToDollars(pricingSummary.projectBudget);
        projectData.TOTAL_PROJECT_BUDGET_WRITTEN = formatCentsAsCurrency(pricingSummary.projectBudget);
        projectData.TOTAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.TOTAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRICING_SERVICE_MODEL = pricingSummary.serviceModel;
        
        projectData.CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.PRELIM_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_CONTRACT_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.PRELIMINARY_TOTAL_PRICE = formatCentsAsCurrency(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE = centsToDollars(pricingSummary.contractValue);
        projectData.FINAL_CONTRACT_PRICE_WRITTEN = formatCentsAsCurrency(pricingSummary.contractValue);
        
        console.log(`Preview Pricing: Contract Value = ${formatCentsAsCurrency(pricingSummary.contractValue)}, Units = ${pricingSummary.unitCount}`);
      }
    } catch (pricingError) {
      console.warn('Pricing enrichment failed for preview, using base values:', pricingError);
    }
    
    // Use the saved contract's clause snapshot so the preview reflects the same
    // clause content and order as the generated document (mirrors download-pdf logic).
    const savedContractForPreview = await pool.query(
      `SELECT id, template_id FROM contracts
       WHERE project_id = $1 AND UPPER(contract_type) = UPPER($2)
       ORDER BY generated_at DESC LIMIT 1`,
      [projectId, contractType]
    );

    let previewSnapshotClauses: any[] | undefined;
    let previewTemplateId: number | undefined;

    if (savedContractForPreview.rows.length > 0) {
      const saved = savedContractForPreview.rows[0];
      previewTemplateId = saved.template_id ?? undefined;

      const snapshotResult = await pool.query(
        `SELECT cc.clause_id AS id, c.slug AS clause_code, cc.header_text AS name,
                cc.body_html AS content, c.contract_types, cc.level AS hierarchy_level,
                cc."order" AS sort_order, c.tags
         FROM contract_clauses cc
         LEFT JOIN clauses c ON c.id = cc.clause_id
         WHERE cc.contract_id = $1
         ORDER BY cc."order" ASC`,
        [saved.id]
      );

      if (snapshotResult.rows.length > 0) {
        previewSnapshotClauses = snapshotResult.rows.map((r: any) => ({
          id: r.id,
          clause_code: r.clause_code || '',
          name: r.name || '',
          content: r.content || '',
          contract_type: Array.isArray(r.contract_types) ? r.contract_types[0] : r.contract_types,
          hierarchy_level: r.hierarchy_level,
          sort_order: r.sort_order,
          parent_clause_id: null,
          conditions: null,
          block_type: null,
          disclosure_code: null,
          category: '',
          variables_used: [],
          service_model_condition: null,
        }));
        console.log(`📄 Preview using clause snapshot (${previewSnapshotClauses.length} clauses) from contract ${saved.id}`);
      }
    }

    // Generate HTML (not PDF)
    const { generateContract } = await import('../lib/contractGenerator');

    const buffer = await generateContract({
      contractType: contractType as 'ONE' | 'MANUFACTURING' | 'ONSITE' | 'MASTER_EF',
      projectData,
      format: 'html',
      snapshotClauses: previewSnapshotClauses,
      templateId: previewTemplateId,
    });
    
    const html = buffer.toString('utf-8');
    
    console.log(`Generated ${contractType} draft preview: ${html.length} chars`);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error("Error generating draft preview:", error);
    res.status(500).json({ 
      error: "Failed to generate preview",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/contracts/compare-service-models", async (req, res) => {
  try {
    const { projectData } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: "projectData is required" });
    }
    
    const getClauses = async (serviceModel: string) => {
      const modifiedData = { ...projectData, serviceModel };
      
      const templateQuery = `
        SELECT id, base_clause_ids, conditional_rules, display_name FROM contract_templates
        WHERE contract_type IN ('ONE', 'ONE_AGREEMENT')
      `;
      const templateResult = await pool.query(templateQuery);
      
      if (templateResult.rows.length === 0) {
        return { clauses: [], clauseIds: [] };
      }
      
      const template = templateResult.rows[0];
      const clauseIds = template.base_clause_ids || [];
      
      if (clauseIds.length === 0) {
        return { clauses: [], clauseIds: [] };
      }
      
      // Use atomic clause structure (header_text, body_html)
      const clausesQuery = `
        SELECT id, slug, header_text, body_html, level, tags
        FROM clauses
        WHERE id = ANY($1)
        ORDER BY "order"
      `;
      
      const clausesResult = await pool.query(clausesQuery, [clauseIds]);
      
      const filteredClauses = clausesResult.rows.filter((clause: any) => {
        // Filter by service model tag if present
        if (!clause.tags) return true;
        const tags = clause.tags;
        if (tags.service_model) {
          return tags.service_model === serviceModel || tags.service_model === "BOTH";
        }
        return true;
      });
      
      return { clauses: filteredClauses, clauseIds: filteredClauses.map((c: any) => c.id) };
    };
    
    const [crcResult, cmosResult] = await Promise.all([
      getClauses("CRC"),
      getClauses("CMOS")
    ]);
    
    const crcOnly = crcResult.clauses.filter(
      (c: any) => !cmosResult.clauseIds.includes(c.id)
    );
    const cmosOnly = cmosResult.clauses.filter(
      (c: any) => !crcResult.clauseIds.includes(c.id)
    );
    const shared = crcResult.clauses.filter(
      (c: any) => cmosResult.clauseIds.includes(c.id)
    );
    
    res.json({
      crc: {
        totalClauses: crcResult.clauses.length,
        clauses: crcResult.clauses
      },
      cmos: {
        totalClauses: cmosResult.clauses.length,
        clauses: cmosResult.clauses
      },
      comparison: {
        crcOnly: crcOnly.map((c: any) => ({ id: c.id, code: c.slug, name: c.header_text })),
        cmosOnly: cmosOnly.map((c: any) => ({ id: c.id, code: c.slug, name: c.header_text })),
        shared: shared.length,
        crcTotal: crcResult.clauses.length,
        cmosTotal: cmosResult.clauses.length
      }
    });
  } catch (error) {
    console.error("Failed to compare service models:", error);
    res.status(500).json({ error: "Failed to compare service models" });
  }
});

// ---------------------------------------------------------------------------
// CLAUSES
// ---------------------------------------------------------------------------

router.get("/clauses", async (req, res) => {
  try {
    const { contractType, search, hierarchyLevel } = req.query;
    
    // New atomic clauses schema (use snake_case column names from DB)
    let query = `
      SELECT 
        id, slug, parent_id, level, "order",
        header_text, body_html, contract_types, tags,
        created_at, updated_at
      FROM clauses
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;
    
    if (contractType && contractType !== 'ALL') {
      // Use JSONB containment operator for array filtering
      query += ` AND contract_types @> $${paramCount}::jsonb`;
      params.push(JSON.stringify([contractType]));
      paramCount++;
    }
    
    if (hierarchyLevel && hierarchyLevel !== 'all') {
      query += ` AND level = $${paramCount}`;
      params.push(parseInt(hierarchyLevel as string));
      paramCount++;
    }
    
    if (search) {
      query += ` AND (header_text ILIKE $${paramCount} OR body_html ILIKE $${paramCount} OR slug ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ` ORDER BY "order", slug`;
    
    const result = await pool.query(query, params);
    
    // Fixed: Use proper FROM/LATERAL pattern for JSONB array unnest
    const totalCountResult = await pool.query('SELECT COUNT(*) as total FROM clauses');
    const distinctTypesResult = await pool.query(`
      SELECT COUNT(DISTINCT type_val)::int as contract_types
      FROM clauses, jsonb_array_elements_text(contract_types) AS type_val
    `);
    
    const statsResult = {
      rows: [{
        total: totalCountResult.rows[0]?.total || 0,
        contract_types: distinctTypesResult.rows[0]?.contract_types || 0,
        categories: 0,
        conditional: 0
      }]
    };
    
    // Map to frontend expected format with atomic fields
    const mappedClauses = result.rows.map((row: any) => {
      return {
        id: row.id,
        clause_code: row.slug,
        parent_clause_id: row.parent_id,
        hierarchy_level: row.level,
        sort_order: row.order,
        header_text: row.header_text || '',
        body_html: row.body_html || '',
        contract_types: row.contract_types || [],
        tags: row.tags || [],
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    res.json({
      clauses: mappedClauses,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error("Failed to fetch clauses:", error);
    res.status(500).json({ error: "Failed to fetch clauses" });
  }
});

router.get("/clauses/meta/categories", async (req, res) => {
  try {
    // Categories removed in new atomic schema - return empty for backward compat
    res.json([]);
  } catch (error) {
    console.error("Failed to fetch clause categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/clauses/meta/contract-types", async (req, res) => {
  try {
    // Use JSONB unnest to get contract types from array
    const result = await pool.query(`
      SELECT type_val as contract_type, COUNT(*)::int as count
      FROM clauses, jsonb_array_elements_text(contract_types) AS type_val
      GROUP BY type_val
      ORDER BY type_val
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch contract types:", error);
    res.status(500).json({ error: "Failed to fetch contract types" });
  }
});

router.get("/clauses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id, slug, parent_id, level, "order",
        header_text, body_html, contract_types, tags,
        created_at, updated_at
      FROM clauses
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Clause not found" });
    }
    
    // Map to frontend expected format
    const row = result.rows[0];
    res.json({
      id: row.id,
      clause_code: row.slug,
      parent_clause_id: row.parent_id,
      hierarchy_level: row.level,
      sort_order: row.order,
      name: row.header_text,
      content: row.body_html,
      contract_types: row.contract_types || [],
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error("Failed to fetch clause:", error);
    res.status(500).json({ error: "Failed to fetch clause" });
  }
});

router.patch("/clauses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Map old field names to new schema
    const { 
      name, content, // Old field names
      headerText, bodyHtml, // camelCase field names
      header_text, body_html, // snake_case field names
      hierarchy_level, level, // Old/new
      contract_types, contractTypes, // Old/new
      sort_order, order, // Old/new
      parent_clause_id, parentId, // Old/new
      tags
    } = req.body;
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    // Support all field name variations (snake_case, camelCase, old names)
    const finalHeaderText = header_text ?? headerText ?? name;
    const finalBodyHtml = body_html ?? bodyHtml ?? content;
    const finalLevel = level ?? hierarchy_level;
    const finalContractTypes = contractTypes ?? contract_types;
    const finalOrder = order ?? sort_order;
    const finalParentId = parentId ?? parent_clause_id;
    
    if (finalHeaderText !== undefined) {
      updateFields.push(`header_text = $${paramCount}`);
      values.push(finalHeaderText);
      paramCount++;
    }
    if (finalBodyHtml !== undefined) {
      updateFields.push(`body_html = $${paramCount}`);
      values.push(finalBodyHtml);
      paramCount++;
    }
    if (finalLevel !== undefined) {
      updateFields.push(`level = $${paramCount}`);
      values.push(finalLevel);
      paramCount++;
    }
    if (finalContractTypes !== undefined) {
      updateFields.push(`contract_types = $${paramCount}`);
      values.push(JSON.stringify(finalContractTypes));
      paramCount++;
    }
    if (finalOrder !== undefined) {
      updateFields.push(`"order" = $${paramCount}`);
      values.push(finalOrder);
      paramCount++;
    }
    if (finalParentId !== undefined) {
      updateFields.push(`parent_id = $${paramCount}`);
      values.push(finalParentId);
      paramCount++;
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramCount}`);
      values.push(JSON.stringify(tags));
      paramCount++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(`
      UPDATE clauses SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Clause not found" });
    }
    
    // Map to frontend expected format (snake_case from DB)
    const row = result.rows[0];
    res.json({
      id: row.id,
      clause_code: row.slug,
      parent_clause_id: row.parent_id,
      hierarchy_level: row.level,
      sort_order: row.order,
      name: row.header_text,
      content: row.body_html,
      contract_types: row.contract_types || [],
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error("Failed to update clause:", error);
    res.status(500).json({ error: "Failed to update clause" });
  }
});

// ---------------------------------------------------------------------------
// CLAUSE REORDER ENDPOINT
// ---------------------------------------------------------------------------

router.post("/clauses/:id/reorder", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    // Support both old (parent_clause_id) and new (parentId) field names
    const { parent_clause_id, parentId, insert_after_id } = req.body;
    const targetParentId = parentId ?? parent_clause_id;

    await client.query('BEGIN');

    const clauseResult = await client.query('SELECT * FROM clauses WHERE id = $1', [id]);
    if (clauseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Clause not found" });
    }
    const clause = clauseResult.rows[0];

    if (targetParentId !== null && targetParentId !== undefined) {
      if (targetParentId === Number(id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Cannot make a clause its own parent" });
      }
      const parentResult = await client.query('SELECT id FROM clauses WHERE id = $1', [targetParentId]);
      if (parentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "Parent clause not found" });
      }

      let currentAncestor = targetParentId;
      const visited = new Set<number>();
      while (currentAncestor !== null) {
        if (currentAncestor === Number(id)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: "Cannot create cyclic parent-child relationship" });
        }
        if (visited.has(currentAncestor)) break;
        visited.add(currentAncestor);
        const ancestorResult = await client.query('SELECT parent_id FROM clauses WHERE id = $1', [currentAncestor]);
        if (ancestorResult.rows.length === 0) break;
        currentAncestor = ancestorResult.rows[0].parent_id;
      }
    }

    const newParentId = targetParentId === undefined ? clause.parent_id : targetParentId;

    const siblingsResult = await client.query(
      `SELECT id, "order" FROM clauses 
       WHERE ($1::int IS NULL AND parent_id IS NULL) OR parent_id = $1
       ORDER BY "order"`,
      [newParentId]
    );

    const siblings = siblingsResult.rows.filter((s: any) => s.id !== Number(id));
    
    let insertIndex = 0;
    if (insert_after_id !== null && insert_after_id !== undefined) {
      const afterIdx = siblings.findIndex((s: any) => s.id === Number(insert_after_id));
      if (afterIdx === -1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "insert_after_id must be a sibling under the target parent" });
      }
      insertIndex = afterIdx + 1;
    }

    siblings.splice(insertIndex, 0, { id: Number(id), order: 0 });

    for (let i = 0; i < siblings.length; i++) {
      await client.query(
        'UPDATE clauses SET "order" = $1, parent_id = $2, updated_at = NOW() WHERE id = $3',
        [i * 10, newParentId, siblings[i].id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Clause reordered successfully" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Failed to reorder clause:", error);
    res.status(500).json({ error: "Failed to reorder clause" });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// COMPONENT LIBRARY PREVIEWS
// ---------------------------------------------------------------------------

router.get("/components/preview/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.json({ html: "<p class='text-center text-gray-500 py-4'>Select a project to see live data</p>" });
    }
    
    const { generatePricingTableHtml, generatePaymentScheduleHtml, generateUnitDetailsHtml } = await import("../lib/tableGenerators");
    const { calculateProjectPricing } = await import("../services/pricingEngine");
    const { renderDynamicTable } = await import("../lib/tableBuilders");
    
    const projectResult = await pool.query(
      `SELECT p.*, pd.*, f.*, c.legal_name as client_name
       FROM projects p
       LEFT JOIN project_details pd ON pd.project_id = p.id
       LEFT JOIN financials f ON f.project_id = p.id
       LEFT JOIN clients c ON c.project_id = p.id
       WHERE p.id = $1`,
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.json({ html: "<p class='text-center text-red-500 py-4'>Project not found</p>" });
    }
    
    const project = projectResult.rows[0];
    
    const unitsResult = await pool.query(
      `SELECT pu.*, hm.name as model_name, hm.model_code, hm.bedrooms, hm.bathrooms, hm.sq_ft
       FROM project_units pu
       JOIN home_models hm ON hm.id = pu.model_id
       WHERE pu.project_id = $1
       ORDER BY pu.unit_label`,
      [projectId]
    );
    
    const units = unitsResult.rows;
    let pricingSummary = null;
    
    try {
      pricingSummary = await calculateProjectPricing(parseInt(projectId as string));
    } catch (e) {
      console.error("Failed to calculate pricing:", e);
    }
    
    let html = "";
    
    switch (componentId) {
      case "pricing_breakdown":
        html = generatePricingTableHtml(pricingSummary, 'MASTER_EF');
        break;
        
      case "payment_schedule":
        const milestones = [
          { name: "Design Agreement Signing", percentage: 10, amount: pricingSummary ? pricingSummary.contractValue * 0.10 : 0, phase: "Design" },
          { name: "Green Light / Production Start", percentage: 40, amount: pricingSummary ? pricingSummary.contractValue * 0.40 : 0, phase: "Production" },
          { name: "Module Delivery", percentage: 40, amount: pricingSummary ? pricingSummary.contractValue * 0.40 : 0, phase: "Delivery" },
          { name: "Final Completion", percentage: 10, amount: pricingSummary ? pricingSummary.contractValue * 0.10 : 0, phase: "Completion" },
        ];
        html = generatePaymentScheduleHtml(milestones);
        break;
        
      case "unit_spec":
        const formattedUnits = units.map(u => ({
          unitLabel: u.unit_label,
          modelName: u.model_name,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          squareFootage: u.sq_ft,
          estimatedPrice: (u.base_price_snapshot || 0) + (u.customization_total || 0),
        }));
        html = generateUnitDetailsHtml(formattedUnits);
        break;
        
      default:
        if (componentId.startsWith("custom_")) {
          const tableId = parseInt(componentId.replace("custom_", ""));
          html = await renderDynamicTable(tableId, parseInt(projectId as string));
        } else {
          html = "<p class='text-center text-gray-500 py-4'>Unknown component</p>";
        }
    }
    
    res.json({ html });
  } catch (error: any) {
    console.error("Component preview error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/components/preview-resolved/:componentId", async (req, res) => {
  try {
    const componentId = parseInt(req.params.componentId);
    const { projectId } = req.query;

    if (!projectId) {
      return res.json({ html: "<p class='text-center text-gray-500 py-4'>Select a project to see live data</p>" });
    }

    const compResult = await pool.query("SELECT * FROM component_library WHERE id = $1", [componentId]);
    if (compResult.rows.length === 0) {
      return res.json({ html: "<p class='text-center text-red-500 py-4'>Component not found</p>" });
    }

    const component = compResult.rows[0];
    const tagName = component.tag_name;
    const pidNum = parseInt(projectId as string);

    const DATA_DRIVEN_TAGS = [
      "TABLE_PRICING_BREAKDOWN",
      "TABLE_PAYMENT_SCHEDULE",
      "TABLE_UNIT_DETAILS",
    ];

    if (component.is_system && DATA_DRIVEN_TAGS.includes(tagName)) {
      const { generatePricingTableHtml, generatePaymentScheduleHtml, generateUnitDetailsHtml } = await import("../lib/tableGenerators");
      const { calculateProjectPricing } = await import("../services/pricingEngine");

      const projectResult = await pool.query(
        `SELECT p.*, pd.*, f.*, c.legal_name as client_name
         FROM projects p
         LEFT JOIN project_details pd ON pd.project_id = p.id
         LEFT JOIN financials f ON f.project_id = p.id
         LEFT JOIN clients c ON c.project_id = p.id
         WHERE p.id = $1`,
        [pidNum]
      );

      if (projectResult.rows.length === 0) {
        return res.json({ html: "<p class='text-center text-red-500 py-4'>Project not found</p>" });
      }

      let pricingSummary: any = null;
      try {
        pricingSummary = await calculateProjectPricing(pidNum);
      } catch (e) {
        console.error("Failed to calculate pricing for preview:", e);
      }

      let html = "";
      switch (tagName) {
        case "TABLE_PRICING_BREAKDOWN":
          html = generatePricingTableHtml(pricingSummary, "MASTER_EF");
          break;
        case "TABLE_PAYMENT_SCHEDULE": {
          const msResult = await pool.query(
            `SELECT * FROM milestones WHERE project_id = $1 ORDER BY milestone_number, id`,
            [pidNum]
          );
          if (msResult.rows.length > 0) {
            const milestones = msResult.rows.map((m: any) => ({
              name: m.name,
              percentage: parseFloat(m.percentage || "0"),
              amount: parseFloat(m.amount || "0"),
              phase: m.phase || "",
            }));
            html = generatePaymentScheduleHtml(milestones);
          } else {
            const cv = pricingSummary?.contractValue || 0;
            const defaults = [
              { name: "Design Agreement Signing", percentage: 10, amount: cv * 0.10, phase: "Design" },
              { name: "Green Light / Production Start", percentage: 40, amount: cv * 0.40, phase: "Production" },
              { name: "Module Delivery", percentage: 40, amount: cv * 0.40, phase: "Delivery" },
              { name: "Final Completion", percentage: 10, amount: cv * 0.10, phase: "Completion" },
            ];
            html = generatePaymentScheduleHtml(defaults);
          }
          break;
        }
        case "TABLE_UNIT_DETAILS": {
          const unitsResult = await pool.query(
            `SELECT pu.*, hm.name as model_name, hm.model_code, hm.bedrooms, hm.bathrooms, hm.sq_ft
             FROM project_units pu
             JOIN home_models hm ON hm.id = pu.model_id
             WHERE pu.project_id = $1
             ORDER BY pu.unit_label`,
            [pidNum]
          );
          const formattedUnits = unitsResult.rows.map((u: any) => ({
            unitLabel: u.unit_label,
            modelName: u.model_name,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            squareFootage: u.sq_ft,
            estimatedPrice: (u.base_price_snapshot || 0) + (u.customization_total || 0),
          }));
          html = generateUnitDetailsHtml(formattedUnits);
          break;
        }
      }

      return res.json({ html });
    }

    let html = component.content || "";

    const variables = html.match(/\{\{[A-Z_]+\}\}/g);
    if (variables && variables.length > 0) {
      const fullProject = await getProjectWithRelations(pidNum);
      if (fullProject) {
        const { mapProjectToVariables } = await import("../lib/mapper");
        const projectData = mapProjectToVariables(fullProject);
        for (const varTag of variables) {
          const varName = varTag.replace(/\{\{|\}\}/g, "");
          const value = (projectData as any)[varName] || `[${varName}]`;
          html = html.replace(new RegExp(varTag.replace(/[{}]/g, '\\$&'), 'g'), value);
        }
      }
    }

    res.json({ html });
  } catch (error: any) {
    console.error("Component resolved preview error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/resolve-clause-tables", async (req, res) => {
  try {
    const { content, projectId } = req.body;
    
    if (!content) {
      return res.json({ html: "" });
    }
    
    let resolvedContent = content;
    
    if (projectId) {
      const pid = parseInt(projectId);
      const { resolveComponentTags } = await import("../services/component-library");

      resolvedContent = await resolveComponentTags(resolvedContent, {
        projectId: pid,
        organizationId: 1,
        contractType: 'MASTER_EF',
        onSiteType: 'CRC',
      });

      const remainingVars = resolvedContent.match(/\{\{[A-Z_]+\}\}/g);
      if (remainingVars && remainingVars.length > 0) {
        const fullProject = await getProjectWithRelations(pid);
        if (fullProject) {
          const { mapProjectToVariables } = await import("../lib/mapper");
          const projectData = mapProjectToVariables(fullProject);
          const uniqueVars = Array.from(new Set(remainingVars));
          for (const varTag of uniqueVars) {
            const varName = (varTag as string).replace(/\{\{|\}\}/g, "");
            const value = (projectData as any)[varName];
            const replacement = (value !== undefined && value !== null && value !== '')
              ? String(value)
              : `[${varName}]`;
            resolvedContent = resolvedContent.replace(new RegExp((varTag as string).replace(/[{}]/g, '\\$&'), 'g'), replacement);
          }
        }
      }
    }
    
    res.json({ html: resolvedContent });
  } catch (error: any) {
    console.error("Failed to resolve clause tables:", error);
    res.status(500).json({ error: error.message });
  }
});

// Scrap a draft — deletes draft contracts for a project.
// If the project itself is in Draft status (no generated contracts), also deletes the project and its data.
router.delete("/projects/:projectId/draft", async (req, res) => {
  const { projectId } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete contract_clauses for draft contracts belonging to this project
    await client.query(
      `DELETE FROM contract_clauses
       WHERE contract_id IN (
         SELECT id FROM contracts WHERE project_id = $1 AND status = 'Draft'
       )`,
      [projectId]
    );

    // Delete the draft contracts
    const deleteResult = await client.query(
      `DELETE FROM contracts WHERE project_id = $1 AND status = 'Draft'`,
      [projectId]
    );

    // Check if the project itself is a draft (was never fully generated)
    const projectResult = await client.query(
      `SELECT status FROM projects WHERE id = $1`,
      [projectId]
    );

    let projectDeleted = false;
    if (projectResult.rows[0]?.status === "Draft") {
      // Delete all child records before deleting the project
      await client.query(`DELETE FROM project_units WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM clients WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM project_details WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM financials WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM milestones WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM warranty_terms WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM contractors WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
      projectDeleted = true;
    }

    await client.query("COMMIT");
    res.json({ success: true, contractsDeleted: deleteResult.rowCount, projectDeleted });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Failed to scrap draft:", error);
    res.status(500).json({ error: "Failed to scrap draft" });
  } finally {
    client.release();
  }
});

export default router;
