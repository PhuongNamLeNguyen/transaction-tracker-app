import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1, "Name is required"),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1, "Password is required"),
    }),
});

export const verifyEmailSchema = z.object({
    query: z.object({
        token: z.string().min(1, "Token is required"),
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
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
