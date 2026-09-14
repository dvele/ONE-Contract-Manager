import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { phases, properties, projectUnits, projects } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";
import { UNIQUE_VIOLATION } from "../lib/unit-attachment";

/**
 * Project properties — the lots a project builds on, identified as P-1..P-n.
 * `propertyCode` is server-assigned. APN, lot number and address are optional
 * and exist so real identifiers can be attached once they are known.
 */

const router = Router();

router.use(requireAuth);

const PropertyInputSchema = z.object({
  phaseId: z.number().int().positive().nullable().optional(),
  apn: z.string().trim().max(60).optional(),
  lotNumber: z.string().trim().max(60).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  zip: z.string().trim().max(10).optional(),
});

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  return parseInt(value, 10);
}

/**
 * A property may only be assigned to a phase in its own project and organization.
 * Returns false when the phase is missing, belongs to another organization, or
 * belongs to a different project. Mirrors `propertyAccessible` in
 * `server/lib/unit-attachment.ts`.
 */
async function phaseAccessible(
  phaseId: number,
  organizationId: number,
  projectId: number,
): Promise<boolean> {
  const [phase] = await db
    .select({ id: phases.id })
    .from(phases)
    .where(
      and(
        eq(phases.id, phaseId),
        eq(phases.organizationId, organizationId),
        eq(phases.projectId, projectId),
      ),
    );
  return !!phase;
}

const MAX_PROPERTY_CODE_ASSIGNMENT_RETRIES = 3;

router.get("/projects/:projectId/properties", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const rows = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.projectId, projectId),
          eq(properties.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(properties.id));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

router.post("/projects/:projectId/properties", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = PropertyInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    // `projects.organizationId` is nullable and pre-multi-tenancy rows have it unset;
    // those stay reachable, matching the delete guard in project-units.ts:132.
    if (project.organizationId !== null && project.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Project not found" });
    }

    // `propertyCode` is derived from the current max suffix, then inserted separately,
    // so two concurrent POSTs for the same project can compute the same code and
    // collide on the (projectId, propertyCode) unique constraint. Retry on that specific
    // violation, recomputing the code against the now-current state each time.
    let created: typeof properties.$inferSelect | undefined;
    for (let attempt = 0; ; attempt++) {
      const existing = await db
        .select({ propertyCode: properties.propertyCode })
        .from(properties)
        .where(eq(properties.projectId, projectId));

      // Codes are P-<n>; derive the next n from the highest existing suffix so a
      // deleted P-3 does not cause the next property to reuse its code.
      const highest = existing.reduce((max, row) => {
        const suffix = parseInt((row.propertyCode || "").replace(/^P-/, ""), 10);
        return Number.isNaN(suffix) ? max : Math.max(max, suffix);
      }, 0);

      try {
        [created] = await db
          .insert(properties)
          .values({
            organizationId: req.organizationId,
            projectId,
            propertyCode: `P-${highest + 1}`,
            ...parsed.data,
          })
          .returning();
        break;
      } catch (error: any) {
        if (error?.code === UNIQUE_VIOLATION && attempt < MAX_PROPERTY_CODE_ASSIGNMENT_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

router.patch("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid property id" });

    const parsed = PropertyInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (typeof parsed.data.phaseId === "number") {
      const [property] = await db
        .select({ projectId: properties.projectId })
        .from(properties)
        .where(and(eq(properties.id, id), eq(properties.organizationId, req.organizationId)));

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (!(await phaseAccessible(parsed.data.phaseId, req.organizationId, property.projectId))) {
        return res.status(404).json({ error: "Phase not found" });
      }
    }

    const [updated] = await db
      .update(properties)
      .set(parsed.data)
      .where(and(eq(properties.id, id), eq(properties.organizationId, req.organizationId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update property:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

router.delete("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid property id" });

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!property || property.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Property not found" });
    }

    const attached = await db
      .select({ id: projectUnits.id })
      .from(projectUnits)
      .where(eq(projectUnits.propertyId, id));

    if (attached.length > 0) {
      return res.status(409).json({
        error: "Remove the units attached to this property before deleting it",
      });
    }

    await db.delete(properties).where(eq(properties.id, id));

    res.json({ message: "Property deleted" });
  } catch (error) {
    console.error("Failed to delete property:", error);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

export default router;
