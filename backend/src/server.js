import 'dotenv/config'; 
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import requestRoutes from "./routes/request.routes.js";


const app = express();

// Trust one reverse proxy, if your deployment has exactly
// one trusted proxy between the client and this application.
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(limiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "sahayak-backend",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Sahayak API",
    version: "1.0.0"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(
    `🚑 Sahayak API running on port ${PORT}`
  );
});