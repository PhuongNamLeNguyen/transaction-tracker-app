import { app } from "./src/app";
import { env } from "./src/config/env";
import { pool } from "./src/db/client";

pool.connect()
    .then(() => {
        console.log("Database connected");
        app.listen(env.port, () =>
            console.log(`Server running on port ${env.port}`),
        );
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
