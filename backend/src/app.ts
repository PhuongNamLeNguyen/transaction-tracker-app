import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { router } from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
    origin: (origin, cb) => {
        const allowed = (process.env.CORS_ORIGIN ?? "").split(",").map(o => o.trim()).filter(Boolean);
        if (!origin || allowed.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded receipt images statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1", router);

app.use(errorMiddleware);
