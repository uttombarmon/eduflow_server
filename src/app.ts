import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.route";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000"], // Adjust as needed
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api", authRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// Top-level error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const status = err?.status || 500;
  const message = err?.message || "Internal Server Error";
  const payload: { message: string; stack?: string } = { message };
  if (process.env.NODE_ENV !== "production" && err?.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

export default app;
