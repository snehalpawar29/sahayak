import { prisma } from "../config/prisma.js";

const requireVerifiedProvider = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== "PROVIDER") {
      return res.status(403).json({
        success: false,
        message: "Only providers can manage resources"
      });
    }

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

    const provider = await prisma.provider.findUnique({
      where: {
        userId: Number(userId)
      }
    });

    if (!provider) {
      return res.status(403).json({
        success: false,
        message:
          "Provider profile not found. Please create your provider profile first."
      });
    }

    if (!provider.verified) {
      return res.status(403).json({
        success: false,
        message:
          "Your provider account is pending verification. You cannot manage emergency resources until an administrator approves your profile."
      });
    }

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

export { requireVerifiedProvider };

export default requireVerifiedProvider;