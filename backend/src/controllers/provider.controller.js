import { prisma } from "../config/prisma.js";
import { uploadVerificationDocument } from "../services/verificationStorage.js";

export const createProvider = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication"
      });
    }

    const {
      organization,
      type,
      city,
      address,
      phone
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "A supporting verification document is required (PDF, JPG or PNG; maximum 5 MB)." });
    }

    if (
      !organization?.trim() ||
      !type?.trim() ||
      !city?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Organization, type and city are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role !== "PROVIDER") {
      return res.status(403).json({
        success: false,
        message: "Only provider accounts can create provider profiles"
      });
    }

    const existingProvider = await prisma.provider.findUnique({
      where: {
        userId
      }
    });

    if (existingProvider) {
      return res.status(409).json({
        success: false,
        message: "Provider profile already exists",
        data: {
          provider: existingProvider
        }
      });
    }

    const documentKey = await uploadVerificationDocument(req.file, userId);

    const provider = await prisma.provider.create({
      data: {
        organization: organization.trim(),
        type: type.trim(),
        city: city.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        verified: false,
        status: "PENDING",
        rejectionReason: null,
        verificationDocumentKey: documentKey,
        verificationDocumentName: req.file.originalname.slice(0, 200),
        verificationDocumentType: req.file.mimetype,
        submittedAt: new Date(),
        reviewedAt: null,
        userId
      }
    });

    return res.status(201).json({
      success: true,
      message:
        "Provider profile created successfully. Waiting for administrator verification.",
      data: {
        provider
      }
    });
  } catch (error) {
    console.error("Create provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create provider profile"
    });
  }
};

export const getProviderProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = Number(req.user.id);

    const provider = await prisma.provider.findUnique({
      where: {
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            city: true
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        provider
      }
    });
  } catch (error) {
    console.error("Get provider profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider profile"
    });
  }
};

export const getProviderDashboard = async (req, res) => {
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
        message: "Only providers can access this dashboard"
      });
    }

    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication"
      });
    }

    const provider = await prisma.provider.findUnique({
      where: {
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            city: true
          }
        },
        resources: {
          orderBy: {
            updatedAt: "desc"
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message:
          "Provider profile not found. Please create your provider profile first."
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        provider
      }
    });
  } catch (error) {
    console.error("Get provider dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load provider dashboard"
    });
  }
};

export const getProviders = async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      where: {
        verified: true,
        status: "APPROVED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true
          }
        },
        resources: {
          orderBy: {
            updatedAt: "desc"
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: {
        providers
      }
    });
  } catch (error) {
    console.error("Get providers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch providers"
    });
  }
};

export const resubmitProviderApplication = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const { organization, type, city, address, phone } = req.body;
    if (!organization?.trim() || !type?.trim() || !city?.trim()) {
      return res.status(400).json({ success: false, message: "Organization, type and city are required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a corrected supporting document (PDF, JPG or PNG; maximum 5 MB)." });
    }
    const existing = await prisma.provider.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Provider profile not found. Create an application first." });
    if (existing.status !== "REJECTED") {
      return res.status(409).json({ success: false, message: "Only rejected applications can be resubmitted." });
    }
    const uploadedKey = await uploadVerificationDocument(req.file, userId);
    const updated = await prisma.provider.update({
      where: { id: existing.id },
      data: {
        organization: organization.trim(),
        type: type.trim(),
        city: city.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        verificationDocumentKey: uploadedKey,
        verificationDocumentName: req.file.originalname.slice(0, 200),
        verificationDocumentType: req.file.mimetype,
        status: "PENDING",
        verified: false,
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null
      }
    });
    return res.status(200).json({ success: true, message: "Application resubmitted for administrator review.", data: { provider: updated } });
  } catch (error) {
    console.error("Resubmit provider application error:", error);
    return res.status(500).json({ success: false, message: "Failed to resubmit provider application" });
  }
};
