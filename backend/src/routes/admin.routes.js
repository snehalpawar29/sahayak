import express from "express";
import {
  getAllProviders,
  getPendingProviders,
  getProviderById,
  getProviderDocument,
  getAllRequests,
  approveProvider,
  rejectProvider
} from "../controllers/admin.controller.js";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();
router.use(protect);
router.use(authorize("ADMIN"));

router.get("/providers", getAllProviders);
router.get("/providers/pending", getPendingProviders);
router.get("/providers/:id/document", getProviderDocument);
router.get("/providers/:id", getProviderById);
router.patch("/providers/:id/approve", approveProvider);
// Keep DELETE for compatibility with the existing frontend/API contract; reason is required in JSON body.
router.delete("/providers/:id/reject", rejectProvider);
router.get("/requests", getAllRequests);

export default router;
