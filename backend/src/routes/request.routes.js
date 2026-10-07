import express from "express";

import {
  createRequest,
  getMyRequests,
  getProviderRequests,
  updateRequestStatus
} from "../controllers/request.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import requireVerifiedProvider from "../middleware/providerVerification.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Citizen Requests
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Provider Requests
|--------------------------------------------------------------------------
*/

router.get(
  "/provider",
  authenticate,
  authorize("PROVIDER"),
  requireVerifiedProvider,
  getProviderRequests
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("PROVIDER"),
  requireVerifiedProvider,
  updateRequestStatus
);

export default router;