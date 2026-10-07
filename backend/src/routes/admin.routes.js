import express from "express";

import {
  getPendingProviders,
  getProviderById,
  approveProvider,
  rejectProvider
} from "../controllers/admin.controller.js";

import protect  from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
const router = express.Router();

router.use(protect);
router.use(authorize("ADMIN"));

router.get("/providers/pending", getPendingProviders);

router.get("/providers/:id", getProviderById);

router.patch("/providers/:id/approve", approveProvider);

router.delete("/providers/:id/reject", rejectProvider);

export default router;