import express from "express";
import cors from "cors";
import router from "./routes/index.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.url}`);
  next();
});

app.get("/api/status", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      hasDb: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
  });
});

app.use("/api", router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api] Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
