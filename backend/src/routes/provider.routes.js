import express from "express";

import {
  createProvider,
  getProviderProfile,
  getProviderDashboard,
  getProviders,
  getPendingProviders,
  approveProvider,
  rejectProvider
} from "../controllers/provider.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Provider Profile
|--------------------------------------------------------------------------
*/

router.post(
  "/profile",
  authMiddleware,
  createProvider
);

router.post("/", authMiddleware, createProvider);
router.get(
  "/profile",
  authMiddleware,
  getProviderProfile
);

router.get(
  "/",
  getProviders
);

/*
|--------------------------------------------------------------------------
| Admin Provider Verification
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/pending",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getPendingProviders
);

router.patch(
  "/admin/:id/approve",
  authMiddleware,
  roleMiddleware("ADMIN"),
  approveProvider
);

router.patch(
  "/admin/:id/reject",
  authMiddleware,
  roleMiddleware("ADMIN"),
  rejectProvider
);

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  getProviderDashboard
);
export default router;