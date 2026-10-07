import express from "express";

import {
  createRequest,
  getMyRequests,
  getProviderRequests,
  updateRequestStatus
} from "../controllers/request.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("CITIZEN"),
  createRequest
);

router.get(
  "/my",
  authenticate,
  authorize("CITIZEN"),
  getMyRequests
);

router.get(
  "/provider",
  authenticate,
  authorize("PROVIDER"),
  getProviderRequests
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("PROVIDER"),
  updateRequestStatus
);

export default router;