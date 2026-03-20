import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1, "Password is required"),
        rememberMe: z.boolean().optional().default(false),
    }),
});

export const verifyEmailSchema = z.object({
    query: z.object({
        token: z.string().min(1, "Token is required"),
        // bỏ userId
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, "Token is required"),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        // bỏ userId
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
