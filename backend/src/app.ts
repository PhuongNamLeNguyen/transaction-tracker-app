import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { router } from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

// Redirect HTTP → HTTPS in production (works behind reverse proxies like Railway, Render)
if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
        const proto = req.headers["x-forwarded-proto"];
        if (proto && proto !== "https") {
            return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
        }
        next();
    });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
    origin: (origin, cb) => {
        const allowed = (process.env.CORS_ORIGIN ?? "").split(",").map(o => o.trim()).filter(Boolean);
        if (allowed.length === 0 && process.env.NODE_ENV === "production") {
            return cb(new Error("CORS_ORIGIN is not configured"));
        }
        if (!origin || allowed.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1", router);

app.use(errorMiddleware);
