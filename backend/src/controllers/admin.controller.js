import { prisma } from "../config/prisma.js";

export const getPendingProviders = async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      where: {
        verified: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            createdAt: true
          }
        },
        resources: {
          select: {
            id: true,
            name: true,
            category: true,
            quantity: true,
            available: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      providers
    });
  } catch (error) {
    console.error("Get pending providers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending providers"
    });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID"
      });
    }

    const provider = await prisma.provider.findUnique({
      where: {
        id: providerId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            role: true,
            createdAt: true
          }
        },
        resources: true
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    return res.status(200).json({
      success: true,
      provider
    });
  } catch (error) {
    console.error("Get provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider"
    });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID"
      });
    }

    const provider = await prisma.provider.findUnique({
      where: {
        id: providerId
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    if (provider.verified) {
      return res.status(400).json({
        success: false,
        message: "Provider is already verified"
      });
    }

    const updatedProvider = await prisma.provider.update({
      where: {
        id: providerId
      },
      data: {
        verified: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Provider approved successfully",
      provider: updatedProvider
    });
  } catch (error) {
    console.error("Approve provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve provider"
    });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID"
      });
    }

    const provider = await prisma.provider.findUnique({
      where: {
        id: providerId
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    await prisma.provider.delete({
      where: {
        id: providerId
      }
    });

    return res.status(200).json({
      success: true,
      message: "Provider application rejected"
    });
  } catch (error) {
    console.error("Reject provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject provider"
    });
  }
};