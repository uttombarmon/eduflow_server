import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { AppError } from "./utils/AppError.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/authRoutes.js";
import courseRouter from "./routes/courseRoutes.js";
import profileRouter from "./routes/profileRoutes.js";

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://eduflow-rust.vercel.app"], // Change to your frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// --- ROUTES ---
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/profile", profileRouter);

app.get("/health", async (req, res) => {
  console.log("Healthy!");
  return res.send("Healthy😊!");
});
app.get("/", (req, res) => {
  throw new Error("BROKEN");
});

// --- ERROR MIDDLEWARE ---
app.use(globalErrorHandler);

app.listen(4000, "0.0.0.0", () => {
  console.log("🚀 Express 5 Server: http://localhost:4000");
});
