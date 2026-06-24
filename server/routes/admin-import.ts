import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middleware/auth";
import multer from "multer";
import mammoth from "mammoth";
import { z } from "zod";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

router.use(requireAuth);

const clauseSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  level: z.number().int().min(1).max(6).default(1),
});

const saveTemplateSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  contractType: z.enum(["MASTER_EF", "ONE", "ONSITE", "MANUFACTURING"]),
  clauses: z.array(clauseSchema).min(1, "At least one clause is required"),
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX files are allowed'));
    }
  }
});

interface ParsedClause {
  name: string;
  content: string;
  level: number;
}

router.post("/admin/parse-docx", upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    const html = result.value;

    const clauses = shredDocument(html);

    res.json({ 
      clauses,
      messages: result.messages 
    });
  } catch (error: any) {
    console.error("Error parsing DOCX:", error);
    res.status(500).json({ error: "Failed to parse DOCX file" });
  }
});

function shredDocument(html: string): ParsedClause[] {
  const clauses: ParsedClause[] = [];
  
  // Clean up empty paragraph tags first
  let cleanedHtml = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
  
  // Regex to match top-level HTML elements (headers, paragraphs, lists, tables, divs)
  const elementRegex = /<(h[1-6]|p|ul|ol|table|div|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
  
  let currentClause: ParsedClause | null = null;
  let lastIndex = 0;
  let match;
  
  // Check for content before the first element
  const firstElementMatch = cleanedHtml.match(/<(h[1-6]|p|ul|ol|table|div|blockquote)/i);
  if (firstElementMatch && firstElementMatch.index && firstElementMatch.index > 0) {
    const preContent = cleanedHtml.substring(0, firstElementMatch.index).trim();
    if (preContent && stripHtml(preContent).trim()) {
      currentClause = {
        name: "Introduction",
        content: preContent,
        level: 1
      };
    }
  }
  
  // Reset regex
  elementRegex.lastIndex = 0;
  
  while ((match = elementRegex.exec(cleanedHtml)) !== null) {
    const tagName = match[1].toLowerCase();
    const attributes = match[2] || '';
    const innerContent = match[3];
    const fullElement = match[0];
    
    // Check if this is a header (h1-h6)
    if (/^h[1-6]$/.test(tagName)) {
      const level = parseInt(tagName.charAt(1), 10);
      const headerText = stripHtml(innerContent).trim();
      
      // Skip empty headers
      if (!headerText) {
        continue;
      }
      
      // Push the current clause if it exists and has content
      if (currentClause && (currentClause.content.trim() || currentClause.name !== "Introduction")) {
        clauses.push(currentClause);
      }
      
      // Start a new clause with this header
      currentClause = {
        name: headerText,
        content: "",
        level
      };
    } else {
      // This is body content (p, ul, ol, table, div, blockquote)
      // Append to current clause's content
      
      // Skip empty paragraphs
      if (tagName === 'p' && !stripHtml(innerContent).trim()) {
        continue;
      }
      
      if (currentClause) {
        // Append the full element HTML to preserve formatting
        currentClause.content += fullElement;
      } else {
        // No header yet - create Introduction clause
        currentClause = {
          name: "Introduction",
          content: fullElement,
          level: 1
        };
      }
    }
    
    lastIndex = elementRegex.lastIndex;
  }
  
  // Push the final clause
  if (currentClause && (currentClause.content.trim() || currentClause.name !== "Introduction")) {
    clauses.push(currentClause);
  }
  
  // Handle edge case: document has no recognizable elements
  if (clauses.length === 0 && cleanedHtml.trim()) {
    clauses.push({
      name: "Document Content",
      content: cleanedHtml.trim(),
      level: 1
    });
  }
  
  // Clean up content in all clauses
  return clauses.map(clause => ({
    ...clause,
    content: cleanContent(clause.content)
  }));
}

function cleanContent(html: string): string {
  return html
    // Remove empty paragraphs
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    // Remove excessive whitespace between tags
    .replace(/>\s+</g, '><')
    // Add single newline between block elements for readability
    .replace(/(<\/(?:p|ul|ol|li|table|tr|div|blockquote)>)(<(?:p|ul|ol|li|table|tr|div|blockquote))/gi, '$1\n$2')
    .trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

router.post("/admin/save-template", async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const parseResult = saveTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.errors 
      });
    }
    
    const { templateName, contractType, clauses } = parseResult.data;

    await client.query('BEGIN');

    const templateResult = await client.query(
      `INSERT INTO contract_templates 
       (organization_id, name, display_name, contract_type, version, status, is_active)
       VALUES ($1, $2, $2, $3, '1.0', 'active', true)
       RETURNING *`,
      [req.organizationId, templateName, contractType]
    );
    
    const template = templateResult.rows[0];
    const clauseIds: number[] = [];

    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const slug = generateSlug(clause.name, i);
      
      const clauseResult = await client.query(
        `INSERT INTO clauses 
         (organization_id, slug, header_text, body_html, level, "order", contract_types)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.organizationId,
          slug,
          clause.name,
          clause.content,
          clause.level || 1,
          i,
          JSON.stringify([contractType])
        ]
      );
      
      const savedClause = clauseResult.rows[0];
      clauseIds.push(savedClause.id);

      await client.query(
        `INSERT INTO template_clauses 
         (template_id, clause_id, order_index, organization_id)
         VALUES ($1, $2, $3, $4)`,
        [template.id, savedClause.id, i, req.organizationId]
      );
    }

    await client.query(
      `UPDATE contract_templates SET base_clause_ids = $1 WHERE id = $2`,
      [clauseIds, template.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ 
      success: true,
      template,
      clauseCount: clauses.length
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error saving template:", error);
    res.status(500).json({ error: "Failed to save template" });
  } finally {
    client.release();
  }
});

function generateSlug(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  return `${base}-${Date.now()}-${index}`;
}

export default router;
