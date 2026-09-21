// server/routes/odoo.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Upstream is Onedot; path is kept as /odoo/projects for client compatibility.
interface OnedotProject {
  id: number;
  project_number: string;
  project_name: string;
  google_drive_folder: string | null;
}

interface OdooProjectShaped {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
  googleDriveFolder: string | null;
}

router.get("/odoo/projects", async (_req, res) => {
  const apiKey = process.env.ONEDOT_API_KEY;
  if (!apiKey) {
    console.error("[OdooProxy] ONEDOT_API_KEY is not set");
    return res.status(500).json({ error: "Odoo API key not configured" });
  }

  try {
    const response = await fetch("https://one-api.dvele.com/projects", {
      headers: { Authorization: `Api-Key ${apiKey}` },
    });

    if (!response.ok) {
      console.error(`[OdooProxy] Odoo API returned ${response.status}`);
      return res
        .status(500)
        .json({ error: "Failed to fetch projects from Odoo" });
    }

    const raw: OnedotProject[] = await response.json();
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
