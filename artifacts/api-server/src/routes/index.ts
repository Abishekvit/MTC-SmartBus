import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { smartbusOperatorRouter, smartbusPublicRouter } from "./smartbus";
import busmapsRouter from "./busmaps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(smartbusPublicRouter);
router.use("/operator", smartbusOperatorRouter);
router.use("/busmaps", busmapsRouter);

export default router;
