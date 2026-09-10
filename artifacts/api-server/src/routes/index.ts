import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { smartbusOperatorRouter, smartbusPublicRouter } from "./smartbus";

const router: IRouter = Router();

router.use(healthRouter);
router.use(smartbusPublicRouter);
router.use("/operator", smartbusOperatorRouter);

export default router;
