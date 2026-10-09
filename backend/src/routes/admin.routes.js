import express from "express";
import {
  getPendingProviders,
  getAllProviders,
  getAllEmergencyRequests,
  getProviderById,
  approveProvider,
  rejectProvider,
  getProviderVerificationDocument
} from "../controllers/admin.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/providers", getAllProviders);
router.get("/providers/pending", getPendingProviders);
router.get("/requests", getAllEmergencyRequests);
router.get("/providers/:id/document", getProviderVerificationDocument);
router.get("/providers/:id", getProviderById);
router.patch("/providers/:id/approve", approveProvider);
router.patch("/providers/:id/reject", rejectProvider);

export default router;
