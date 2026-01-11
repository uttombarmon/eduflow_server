import express from "express";
import { AppError } from "./utils/AppError.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/authRoutes.js";

const app = express();
app.use(express.json());

// --- ROUTES ---
app.use("/api/v1/auth", authRouter);

// Express 5 AUTO-CATCHES async errors.
// No more "catchAsync" or try/catch blocks needed!
app.get("/test-async", async (req, res) => {
  // If this logic fails or throws, Express 5 passes it to the error handler automatically
  throw new AppError("Async error handled automatically by Express 5!", 400);
});
app.get("/", (req, res) => {
  throw new Error("BROKEN"); // Express will catch this on its own.
});

// --- ERROR MIDDLEWARE ---
app.use(globalErrorHandler);

app.listen(3000, () => {
  console.log("🚀 Express 5 Server: http://localhost:3000");
});
