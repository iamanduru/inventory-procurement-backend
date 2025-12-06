import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";


// NEW: import routers
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import itemRouter from "./routes/item.routes";
import warehouseRouter from "./routes/warehouse.routes";


const app = express();

// Basic security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

// JSON body parsing
app.use(express.json());

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// HTTP request logging
if (ENV.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX,
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/items", itemRouter);
app.use("/api/warehouses", warehouseRouter);


// Error handler
app.use(errorHandler);

export default app;
