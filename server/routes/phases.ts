import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { phases, properties, projects } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

/**
 * Project phases — the grouping that drives per-phase pricing, scheduling and
 * milestones. A phase holds any number of properties; a property belongs to one
 * phase. `phaseNumber` is assigned by the server, never by the client.
 */

const router = Router();

router.use(requireAuth);

const PhaseInputSchema = z.object({
  name: z.string().trim().max(120).optional(),
  startOffsetDays: z.number().int().min(-365).max(365).optional(),
  manufacturingDays: z.number().int().min(0).max(1095).optional(),
  onsiteDays: z.number().int().min(0).max(1095).optional(),
  deliveryLagDays: z.number().int().min(0).max(365).optional(),
});

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

const UNIQUE_VIOLATION = "23505";
const MAX_PHASE_NUMBER_ASSIGNMENT_RETRIES = 3;

router.get("/projects/:projectId/phases", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const rows = await db
      .select()
      .from(phases)
      .where(
        and(
          eq(phases.projectId, projectId),
          eq(phases.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(phases.phaseNumber));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch phases:", error);
    res.status(500).json({ error: "Failed to fetch phases" });
  }
});

router.post("/projects/:projectId/phases", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = PhaseInputSchema.safeParse(req.body);
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

    // `phaseNumber` is derived from the current max, then inserted separately, so two
    // concurrent POSTs for the same project can compute the same number and collide on
    // the (projectId, phaseNumber) unique constraint. Retry on that specific violation,
    // recomputing the number against the now-current state each time.
    let created: typeof phases.$inferSelect | undefined;
    for (let attempt = 0; ; attempt++) {
      const existing = await db
        .select({ phaseNumber: phases.phaseNumber })
        .from(phases)
        .where(eq(phases.projectId, projectId));

      const nextNumber =
        existing.reduce((max, row) => Math.max(max, row.phaseNumber), 0) + 1;

      try {
        [created] = await db
          .insert(phases)
          .values({
            organizationId: req.organizationId,
            projectId,
            phaseNumber: nextNumber,
            ...parsed.data,
          })
          .returning();
        break;
      } catch (error: any) {
        if (error?.code === UNIQUE_VIOLATION && attempt < MAX_PHASE_NUMBER_ASSIGNMENT_RETRIES) {
          continue;
        }
        throw error;
      }
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create phase:", error);
    res.status(500).json({ error: "Failed to create phase" });
  }
});

router.patch("/phases/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid phase id" });

    const parsed = PhaseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [updated] = await db
      .update(phases)
      .set(parsed.data)
      .where(eq(phases.id, id))
      .returning();

    if (!updated || updated.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Phase not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update phase:", error);
    res.status(500).json({ error: "Failed to update phase" });
  }
});

router.delete("/phases/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid phase id" });

    const [phase] = await db.select().from(phases).where(eq(phases.id, id));
    if (!phase || phase.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Phase not found" });
    }

    // Properties outlive their phase; unassigning keeps them editable rather
    // than cascading a delete through the units attached to them.
    await db
      .update(properties)
      .set({ phaseId: null })
      .where(eq(properties.phaseId, id));

    await db.delete(phases).where(eq(phases.id, id));

    res.json({ message: "Phase deleted" });
  } catch (error) {
    console.error("Failed to delete phase:", error);
    res.status(500).json({ error: "Failed to delete phase" });
  }
});

export default router;
