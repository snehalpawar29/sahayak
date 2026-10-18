import express from "express";
import rateLimit from "express-rate-limit";

import {
  createRequest,
  createGuestRequest,
  getMyRequests,
  getProviderRequests,
  updateRequestStatus
} from "../controllers/request.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();

// Guest submissions are public, so limit abuse without requiring a citizen account.
const guestRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many emergency requests. Please try again later."
  }
});

router.post("/guest", guestRequestLimiter, createGuestRequest);

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