import { Router, Request, Response } from "express";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { milestones, phases } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";
import { phaseIdsForProject, projectAccessible } from "../lib/unit-attachment";

/**
 * Per-phase payment schedules.
 *
 * A milestone stores only its percentage — amounts are derived against the
 * phase's value at read time by `buildPhaseRollups`, so they cannot go stale
 * when pricing changes.
 *
 * PUT replaces the project's entire phase-keyed set in one transaction rather
 * than offering per-row CRUD: "each phase totals 100%" is a property of the
 * whole set, so there is no single row-level request at which it is checkable.
 * Legacy project-level milestones — those with a null `phaseId` — are left
 * untouched, and the project-level payment schedule keeps reading them.
 */

const router = Router();

router.use(requireAuth);

const MAX_MILESTONES_PER_PHASE = 50;

/** Percentages in hundredths, so a float sum cannot miss an exact 100. */
const REQUIRED_TOTAL_HUNDREDTHS = 10_000;

const MilestoneInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger: z.string().trim().min(1).max(200),
  percentage: z.number().finite().min(0).max(100),
});

const PayloadSchema = z.record(
  z.string().regex(/^[1-9]\d*$/, "Invalid phase id"),
  z.array(MilestoneInputSchema).max(MAX_MILESTONES_PER_PHASE, `A phase may have at most ${MAX_MILESTONES_PER_PHASE} milestones`),
);

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  return parseInt(value, 10);
}

/** `{ "<phaseId>": [row, …] }` — the shape both verbs speak. */
function groupByPhase<T extends { phaseId: number | null }>(rows: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const row of rows) {
    if (row.phaseId === null) continue;
    (grouped[String(row.phaseId)] ??= []).push(row);
  }
  return grouped;
}

router.get("/projects/:projectId/milestones", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    if (!(await projectAccessible(projectId, req.organizationId))) {
      return res.status(404).json({ error: "Project not found" });
    }

    const rows = await db
      .select({
        id: milestones.id,
        phaseId: milestones.phaseId,
        milestoneNumber: milestones.milestoneNumber,
        name: milestones.name,
        trigger: milestones.dueUpon,
        percentage: milestones.percentage,
      })
      .from(milestones)
      .where(and(eq(milestones.projectId, projectId), isNotNull(milestones.phaseId)))
      .orderBy(asc(milestones.milestoneNumber), asc(milestones.id));

    res.json(groupByPhase(rows));
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

router.put("/projects/:projectId/milestones", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const parsed = PayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const payload = parsed.data;
    const phaseIds = Object.keys(payload).map((key) => parseInt(key, 10));

    if (phaseIds.length === 0) {
      return res.status(400).json({ error: "No milestones provided" });
    }

    if (!(await projectAccessible(projectId, req.organizationId))) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectPhaseIds = await phaseIdsForProject(projectId, req.organizationId);
    const foreign = phaseIds.find((id) => !projectPhaseIds.has(id));
    if (foreign !== undefined) {
      return res.status(404).json({ error: `Phase ${foreign} not found in this project` });
    }

    for (const phaseId of phaseIds) {
      const rows = payload[String(phaseId)];
      if (rows.length === 0) continue;

      const totalHundredths = rows.reduce((sum, row) => sum + Math.round(row.percentage * 100), 0);
      if (totalHundredths !== REQUIRED_TOTAL_HUNDREDTHS) {
        return res.status(400).json({
          error: `Phase ${phaseId}'s milestones total ${(totalHundredths / 100).toFixed(2)}%, not 100%`,
        });
      }
    }

    // The phase label the project-level reader shows for these rows. Read before
    // the transaction: it is a lookup, not part of what is being replaced.
    const phaseRows = await db
      .select({ id: phases.id, phaseNumber: phases.phaseNumber, name: phases.name })
      .from(phases)
      .where(and(eq(phases.projectId, projectId), inArray(phases.id, phaseIds)));
    const labels = new Map(phaseRows.map((p) => [p.id, p.name || `Phase ${p.phaseNumber}`]));

    // milestoneNumber comes from array order and amount is never read from the
    // body: a client-supplied amount would be a second source of truth beside
    // the percentage next to it.
    const toInsert = phaseIds.flatMap((phaseId) =>
      payload[String(phaseId)].map((row, index) => ({
        projectId,
        phaseId,
        milestoneType: labels.get(phaseId) ?? `Phase ${phaseId}`,
        milestoneNumber: index + 1,
        name: row.name,
        dueUpon: row.trigger,
        percentage: row.percentage,
      })),
    );

    // Replacing the whole phase-keyed set in one transaction is what makes a
    // rejected save leave the previous schedule intact rather than half-applied.
    await db.transaction(async (tx) => {
      await tx
        .delete(milestones)
        .where(and(eq(milestones.projectId, projectId), isNotNull(milestones.phaseId)));

      if (toInsert.length > 0) {
        await tx.insert(milestones).values(toInsert);
      }
    });

    const stored = await db
      .select({
        id: milestones.id,
        phaseId: milestones.phaseId,
        milestoneNumber: milestones.milestoneNumber,
        name: milestones.name,
        trigger: milestones.dueUpon,
        percentage: milestones.percentage,
      })
      .from(milestones)
      .where(and(eq(milestones.projectId, projectId), isNotNull(milestones.phaseId)))
      .orderBy(asc(milestones.milestoneNumber), asc(milestones.id));

    res.json(groupByPhase(stored));
  } catch (error) {
    console.error("Failed to save milestones:", error);
    res.status(500).json({ error: "Failed to save milestones" });
  }
});

export default router;
