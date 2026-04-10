// server/routes/odoo.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

interface OdooProject {
  id: number;
  name: string;
  company_id: boolean | number;
  tag_ids: number[];
}

interface OdooProjectShaped {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
}

function parseOdooProjectName(name: string): { projectNumber: string; projectName: string } {
  const separatorIndex = name.indexOf(' - ');
  if (separatorIndex === -1) {
    return { projectNumber: name, projectName: '' };
  }
  return {
    projectNumber: name.slice(0, separatorIndex),
    projectName: name.slice(separatorIndex + 3),
  };
}

router.get('/odoo/projects', async (req, res) => {
  const apiKey = process.env.VITE_ONEDOT_API_KEY;
  if (!apiKey) {
    console.error('[OdooProxy] VITE_ONEDOT_API_KEY is not set');
    return res.status(500).json({ error: 'Odoo API key not configured' });
  }

  try {
    const response = await fetch('https://one-api.dvele.com/odoo/projects', {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      console.error(`[OdooProxy] Odoo API returned ${response.status}`);
      return res.status(500).json({ error: 'Failed to fetch projects from Odoo' });
    }

    const raw: OdooProject[] = await response.json();
    const projects: OdooProjectShaped[] = raw.map((p) => {
      const { projectNumber, projectName } = parseOdooProjectName(p.name);
      return { id: p.id, projectNumber, projectName, displayName: p.name };
    });

    res.json(projects);
  } catch (err) {
    console.error('[OdooProxy] Fetch failed:', err);
    res.status(500).json({ error: 'Failed to reach Odoo API' });
  }
});

export default router;
