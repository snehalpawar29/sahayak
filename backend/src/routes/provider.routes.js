import express from "express";

import {
  createProvider,
  getProviderProfile,
  getProviderDashboard,
  getProviders
} from "../controllers/provider.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

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
  createProvider
);

router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("PROVIDER"),
  createProvider
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