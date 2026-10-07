import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import requestRoutes from "./routes/request.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed")
      );
    }
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests. Please try again later."
  }
});

app.use(limiter);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      status: "healthy",
      service: "sahayak-backend",
      timestamp: new Date().toISOString()
    });
  }
);

/*
|--------------------------------------------------------------------------
| Root
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Sahayak Emergency Resource Coordination API"
    });
  }
);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/providers",
  providerRoutes
);

app.use(
  "/api/resources",
  resourceRoutes
);

app.use(
  "/api/requests",
  requestRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      error?.message ===
      "CORS origin not allowed"
    ) {
      return res.status(403).json({
        success: false,
        message: "CORS origin not allowed"
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error"
    });
  }
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sahayak backend running on port ${PORT}`
    );
  }
);