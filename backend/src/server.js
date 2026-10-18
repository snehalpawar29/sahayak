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
// Trust exactly one reverse proxy (Nginx) in the deployed Compose setup.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
// Provider authorization documents are base64-encoded in JSON and stored in PostgreSQL.
app.use(express.json({ limit: "7mb" }));
app.use(express.urlencoded({ extended: false, limit: "7mb" }));
app.use(limiter);

app.get("/api/health", (_req, res) => res.status(200).json({
  success: true, service: "sahayak-backend", status: "healthy", timestamp: new Date().toISOString()
}));
app.get("/", (_req, res) => res.json({ success: true, message: "Welcome to Sahayak API", version: "1.0.0" }));
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  if (error?.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request is too large. Provider documents must be 4 MB or smaller." });
  return res.status(500).json({ success: false, message: "Internal server error" });
});
app.listen(PORT, () => console.log(`🚑 Sahayak API running on port ${PORT}`));
