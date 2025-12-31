import app from "./app";
import dotenv from "dotenv";
import { Server } from "http";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server: Server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
    setTimeout(() => process.exit(1), 10000);
  } else {
    process.exit(1);
  }
});

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully.`);
  if (server) {
    server.close(() => {
      console.log("Closed out remaining connections.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Forcing shutdown.");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
