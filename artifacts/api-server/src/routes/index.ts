import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import requestsRouter from "./requests";
import usersRouter from "./users";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requestsRouter);
router.use(usersRouter);
router.use(adminRouter);

export default router;
