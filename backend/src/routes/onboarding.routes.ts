import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.middleware";
import { onboardingController } from "../controllers/onboarding.controller";

export const onboardingRouter = Router();

// All onboarding routes require a verified user
onboardingRouter.use(authenticate, requireVerified);

onboardingRouter.get("/status", onboardingController.getStatus);
onboardingRouter.get("/categories", onboardingController.getCategories);
onboardingRouter.post("/budget-setup", onboardingController.setup);
