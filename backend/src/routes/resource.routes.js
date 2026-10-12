import express from "express";

import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource
} from "../controllers/resource.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import requireVerifiedProvider from "../middleware/providerVerification.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Resource APIs
|--------------------------------------------------------------------------
*/

/*
 * Anyone can search/view available resources.
 */
router.get("/", getResources);

router.get("/:id", getResourceById);


/*
|--------------------------------------------------------------------------
| Provider Resource APIs
|--------------------------------------------------------------------------
*/

/*
 * Only authenticated + verified providers
 * can create resources.
 */
router.post(
  "/",
  authMiddleware,
  requireVerifiedProvider,
  createResource
);


/*
 * Only authenticated + verified providers
 * can update resources.
 */
router.patch(
  "/:id",
  authMiddleware,
  requireVerifiedProvider,
  updateResource
);


/*
 * Only authenticated + verified providers
 * can delete resources.
 */
router.delete(
  "/:id",
  authMiddleware,
  requireVerifiedProvider,
  deleteResource
);

export default router;