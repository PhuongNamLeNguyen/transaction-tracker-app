import dotenv from "dotenv";
dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

export const env = {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    // Google OAuth (optional — leave empty to disable)
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/v1/auth/google/callback",
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
    // Resend email service (fallback)
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
    // Gmail SMTP
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: Number(process.env.SMTP_PORT) || 465,
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPass: process.env.SMTP_PASS ?? "",
};
