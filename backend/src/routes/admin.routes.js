import express from "express";

import {
  getPendingProviders,
  getProviderById,
  approveProvider,
  rejectProvider
} from "../controllers/admin.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/providers/pending", getPendingProviders);

router.get("/providers/:id", getProviderById);

router.patch("/providers/:id/approve", approveProvider);

// Support DELETE for the frontend/current API design.
router.delete("/providers/:id/reject", rejectProvider);

// Also support PATCH in case the frontend uses PATCH.
router.patch("/providers/:id/reject", rejectProvider);

export default router;