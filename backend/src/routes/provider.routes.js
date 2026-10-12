import express from "express";

import {
  createProvider,
  getProviders
} from "../controllers/provider.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("PROVIDER"),
  createProvider
);

router.get("/", getProviders);

export default router;