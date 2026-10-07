import { prisma } from "../config/prisma.js";

/*
|--------------------------------------------------------------------------
| CREATE PROVIDER PROFILE
|--------------------------------------------------------------------------
*/

export const createProvider = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = Number(req.user.id);

    if (!Number.isInteger(userId)) {
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

    if (!organization || !type || !city) {
      return res.status(400).json({
        success: false,
        message: "Organization, type and city are required"
      });
    }

    /*
     * Make sure this user is a PROVIDER.
     */

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

    /*
     * Check whether provider profile already exists.
     */

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

    /*
     * New providers always start as unverified.
     */

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


/*
|--------------------------------------------------------------------------
| GET MY PROVIDER PROFILE
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| GET PENDING PROVIDERS
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

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
            role: true,
            city: true,
            createdAt: true
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
      data: {
        providers
      }
    });
  } catch (error) {
    console.error("Get pending providers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending providers"
    });
  }
};


/*
|--------------------------------------------------------------------------
| APPROVE PROVIDER
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

export const approveProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!Number.isInteger(providerId)) {
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
            role: true
          }
        }
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
      data: {
        provider: updatedProvider
      }
    });
  } catch (error) {
    console.error("Approve provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve provider"
    });
  }
};


/*
|--------------------------------------------------------------------------
| REJECT PROVIDER
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

export const rejectProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!Number.isInteger(providerId)) {
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
            role: true
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const updatedProvider = await prisma.provider.update({
      where: {
        id: providerId
      },
      data: {
        verified: false
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
      message: "Provider rejected successfully",
      data: {
        provider: updatedProvider
      }
    });
  } catch (error) {
    console.error("Reject provider error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject provider"
    });
  }
};

/*
|--------------------------------------------------------------------------
| PROVIDER DASHBOARD
|--------------------------------------------------------------------------
*/

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

    if (!Number.isInteger(userId)) {
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


/*
|--------------------------------------------------------------------------
| GET VERIFIED PROVIDERS
| PUBLIC
|--------------------------------------------------------------------------
*/

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