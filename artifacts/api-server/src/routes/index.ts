import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import cvRouter from "./cv.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cvRouter);

export default router;
