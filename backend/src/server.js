import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
    message: "Welcome to Sahayak API"
  });
});

app.listen(PORT, () => {
  console.log(`Sahayak backend running on port ${PORT}`);
});