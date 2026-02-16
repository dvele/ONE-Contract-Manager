import { Router } from "express";
import projectsRouter from "./projects";
import financialsRouter from "./financials";
import contractsRouter from "./contracts";
import systemRouter from "./system";
import homeModelsRouter from "./home-models";
import exhibitsRouter from "./exhibits";
import stateDisclosuresRouter from "./state-disclosures";
import contractorEntitiesRouter from "./contractor-entities";
import projectUnitsRouter from "./project-units";
import contractTemplatesRouter from "./contract-templates";
import contractVariablesRouter from "./contract-variables";
import llcsRouter from "./llcs";
import adminImportRouter from "./admin-import";
import componentsRouter from "./components";

const router = Router();

router.use(projectsRouter);
router.use(financialsRouter);
router.use(contractsRouter);
router.use(systemRouter);

router.use(homeModelsRouter);
router.use(exhibitsRouter);
router.use(stateDisclosuresRouter);
router.use(contractorEntitiesRouter);
router.use(projectUnitsRouter);
router.use(contractTemplatesRouter);
router.use(contractVariablesRouter);
router.use(llcsRouter);
router.use(adminImportRouter);
router.use(componentsRouter);

export default router;
