import { Router } from "express";
import { authRouter } from "./auth.routes";
import { onboardingRouter } from "./onboarding.routes";
import { dashboardRouter } from "./dashboard.routes";
import { transactionsRouter } from "./transactions.routes";
import { budgetRouter } from "./budget.routes";
import { settingsRouter } from "./settings.routes";
import { receiptsRouter } from "./receipts.routes";
import { aiRouter } from "./ai.routes";
import { exchangeRouter } from "./exchange.routes";

export const router = Router();

router.use("/auth", authRouter);
router.use("/onboarding", onboardingRouter);
router.use("/dashboard", dashboardRouter);
router.use("/transactions", transactionsRouter);
router.use("/budget", budgetRouter);
router.use("/settings", settingsRouter);
router.use("/receipts", receiptsRouter);
router.use("/ai", aiRouter);
router.use("/exchange-rate", exchangeRouter);
