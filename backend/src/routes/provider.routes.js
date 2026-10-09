import express from "express";

import {
  createProvider,
  getProviderProfile,
  getProviderDashboard,
  getProviders,
  resubmitProviderApplication
} from "../controllers/provider.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import verificationUpload from "../middleware/verificationUpload.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Providers
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getProviders
);

/*
|--------------------------------------------------------------------------
| Provider Profile
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  verificationUpload.single("document"),
  createProvider
);

router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  verificationUpload.single("document"),
  createProvider
);

router.patch(
  "/profile/resubmit",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  verificationUpload.single("document"),
  resubmitProviderApplication
);

router.get(
  "/profile",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  getProviderProfile
);

/*
|--------------------------------------------------------------------------
| Provider Dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  getProviderDashboard
);

export default router;