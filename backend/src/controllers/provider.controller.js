import { prisma } from "../config/prisma.js";

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

    const provider = await prisma.provider.create({
      data: {
        organization: organization.trim(),
        type: type.trim(),
        city: city.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        verified: false,
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
        verified: true
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