// server/routes/odoo.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { fetchOnedotProjects } from "../lib/onedot";

const router = Router();
router.use(requireAuth);

// Upstream is Onedot; path is kept as /odoo/projects for client compatibility.
interface OdooProjectShaped {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
  googleDriveFolder: string | null;
}

router.get("/odoo/projects", async (_req, res) => {
  try {
    const raw = await fetchOnedotProjects();
    // Populated on 42 of 44 projects; null is a real answer, not an error.
    const projects: OdooProjectShaped[] = raw.map((p) => ({
      id: p.id,
      projectNumber: p.project_number.trim(),
      projectName: p.project_name.trim(),
      displayName: `${p.project_number.trim()} - ${p.project_name.trim()}`,
      googleDriveFolder: p.google_drive_folder || null,
    }));

    res.json(projects);
  } catch (err) {
    console.error("[OdooProxy] Fetch failed:", err);
    res.status(500).json({ error: "Failed to reach Odoo API" });
  }
});

export default router;
