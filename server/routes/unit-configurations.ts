import { Router, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { projectUnits, projects, unitConfigurations } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

/**
 * Unpriced unit configurations — a named square-footage and price-per-square-foot
 * range standing in for a catalog model that does not exist yet.
 *
 * `derivedOffsitePrice` is always computed here from sqFt x the HIGH end of the
 * range and never accepted from the client: it is what every downstream total,
 * milestone and contract figure is calculated from.
 */

const router = Router();

router.use(requireAuth);

const MAX_DERIVED_OFFSITE_PRICE = 2_147_483_647; // Postgres integer ceiling

const ConfigurationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    sqFt: z.number().int().positive().max(100_000),
    pricePerSqFtLow: z.number().int().nonnegative(),
    pricePerSqFtHigh: z.number().int().nonnegative(),
  })
  .refine((c) => c.pricePerSqFtHigh >= c.pricePerSqFtLow, {
    message: "pricePerSqFtHigh must be greater than or equal to pricePerSqFtLow",
  })
  .refine((c) => c.sqFt * c.pricePerSqFtHigh <= MAX_DERIVED_OFFSITE_PRICE, {
    message: "Square footage times the high price per square foot exceeds the maximum storable price",
  });

function parseId(raw: string | string[]): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  return parseInt(value, 10);
}

function derivePrice(sqFt: number, pricePerSqFtHigh: number): number {
  return sqFt * pricePerSqFtHigh;
}

router.get("/projects/:projectId/unit-configurations", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: "Invalid project id" });

    const rows = await db
      .select()
      .from(unitConfigurations)
      .where(
        and(
          eq(unitConfigurations.projectId, projectId),
          eq(unitConfigurations.organizationId, req.organizationId),
        ),
      )
      .orderBy(asc(unitConfigurations.id));

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch unit configurations:", error);
    res.status(500).json({ error: "Failed to fetch unit configurations" });
  }
});

router.post("/projects/:projectId/unit-configurations", async (req: Request, res: Response) => {
  try {
    const projectId = parseId(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: "Invalid project id" });

    const parsed = ConfigurationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return res.status(404).json({ error: "Project not found" });
    // `projects.organizationId` is nullable and pre-multi-tenancy rows have it unset.
    if (project.organizationId !== null && project.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [created] = await db
      .insert(unitConfigurations)
      .values({
        organizationId: req.organizationId,
        projectId,
        ...parsed.data,
        derivedOffsitePrice: derivePrice(parsed.data.sqFt, parsed.data.pricePerSqFtHigh),
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create unit configuration:", error);
    res.status(500).json({ error: "Failed to create unit configuration" });
  }
});

router.patch("/unit-configurations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid configuration id" });

    const parsed = ConfigurationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [updated] = await db
      .update(unitConfigurations)
      .set({
        ...parsed.data,
        derivedOffsitePrice: derivePrice(parsed.data.sqFt, parsed.data.pricePerSqFtHigh),
      })
      .where(
        and(
          eq(unitConfigurations.id, id),
          eq(unitConfigurations.organizationId, req.organizationId),
        ),
      )
      .returning();

    if (!updated) return res.status(404).json({ error: "Unit configuration not found" });

    res.json(updated);
  } catch (error) {
    console.error("Failed to update unit configuration:", error);
    res.status(500).json({ error: "Failed to update unit configuration" });
  }
});

router.delete("/unit-configurations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid configuration id" });

    const [configuration] = await db
      .select()
      .from(unitConfigurations)
      .where(eq(unitConfigurations.id, id));

    if (!configuration || configuration.organizationId !== req.organizationId) {
      return res.status(404).json({ error: "Unit configuration not found" });
    }

    const attached = await db
      .select({ id: projectUnits.id })
      .from(projectUnits)
      .where(eq(projectUnits.configurationId, id));

    if (attached.length > 0) {
      return res.status(409).json({
        error: "Remove the units using this configuration before deleting it",
      });
    }

    await db.delete(unitConfigurations).where(eq(unitConfigurations.id, id));

    res.json({ message: "Unit configuration deleted" });
  } catch (error) {
    console.error("Failed to delete unit configuration:", error);
    res.status(500).json({ error: "Failed to delete unit configuration" });
  }
});

export default router;
