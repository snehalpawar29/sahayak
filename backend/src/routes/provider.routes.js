import express from "express";
import { createProvider, getProviders, getMyProvider, updateVerificationDocument } from "../controllers/provider.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();

// Keep specific authenticated routes before the public directory route.
router.get("/me", authenticate, authorize("PROVIDER"), getMyProvider);
router.post("/verification-document", authenticate, authorize("PROVIDER"), updateVerificationDocument);
router.post("/", authenticate, authorize("PROVIDER"), createProvider);
router.get("/", getProviders);

export default router;
