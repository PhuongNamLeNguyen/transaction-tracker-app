import { Router } from "express";
import rateLimit from "express-rate-limit";
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

// Rate limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many registration attempts. Please try again later." },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many password reset requests. Please try again later." },
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many refresh requests. Please try again later." },
});

// Public routes — không cần JWT
authRouter.post("/register", registerLimiter, validate(registerSchema), authController.register);
authRouter.post("/login", loginLimiter, validate(loginSchema), authController.login);
authRouter.post(
    "/verify-email",
    validate(verifyEmailSchema),
    authController.verifyEmail,
);
authRouter.post("/refresh", refreshLimiter, authController.refresh);
authRouter.post(
    "/forgot-password",
    forgotPasswordLimiter,
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

// Google OAuth
authRouter.get("/google", authController.googleRedirect);
authRouter.get("/google/callback", authController.googleCallback);
