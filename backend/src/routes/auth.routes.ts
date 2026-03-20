import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "../validators/auth.validator";

export const authRouter = Router();

// Public routes — không cần JWT
authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.get(
    "/verify-email",
    validate(verifyEmailSchema),
    authController.verifyEmail,
);
authRouter.post("/refresh", authController.refresh);
authRouter.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    authController.forgotPassword,
);
authRouter.post(
    "/reset-password",
    validate(resetPasswordSchema),
    authController.resetPassword,
);

// Protected — cần JWT (logout cần biết user id)
authRouter.post("/logout", authenticate, authController.logout);
