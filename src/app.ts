import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

//Basic security headers
app.use(helmet());

//CORS configuration
app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

// JSON body parsing
app.use(express.json());

// HTTP request logging
if (ENV.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Basic rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS, // e.g., 15 minutes
  max: ENV.RATE_LIMIT_MAX, // limit each IP
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// TODO: mount feature routes (auth, inventory, procurement, finance) here


// Error handler (should be last)
app.use(errorHandler);

export default app;