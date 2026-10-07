import {prisma} from "../config/prisma.js";

const requireVerifiedProvider = async (req, res, next) => {
  try {
    // Authentication middleware should already have
    // populated req.user.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Only PROVIDER users can access provider resource APIs.
    if (req.user.role !== "PROVIDER") {
      return res.status(403).json({
        success: false,
        message: "Only providers can manage resources"
      });
    }

    // Support common JWT payload formats.
    const userId =
      req.user.id ??
      req.user.userId ??
      req.user.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    // Find the provider profile belonging to this user.
    const provider = await prisma.provider.findUnique({
      where: {
        userId: Number(userId)
      }
    });

    // Provider profile does not exist.
    if (!provider) {
      return res.status(403).json({
        success: false,
        message:
          "Provider profile not found. Please create your provider profile first."
      });
    }

    // Provider exists but has not been approved.
    if (!provider.verified) {
      return res.status(403).json({
        success: false,
        message:
          "Your provider account is pending verification. You cannot manage emergency resources until an administrator approves your profile."
      });
    }

    // Make provider available to controllers.
    req.provider = provider;

    next();
  } catch (error) {
    console.error(
      "Provider verification middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to verify provider authorization"
    });
  }
};

export default requireVerifiedProvider;