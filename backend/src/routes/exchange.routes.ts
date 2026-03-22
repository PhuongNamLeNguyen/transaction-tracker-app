import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { exchangeController } from "../controllers/exchange.controller";

export const exchangeRouter = Router();

exchangeRouter.use(authenticate, requireVerified);

exchangeRouter.get("/", exchangeController.getRate);
