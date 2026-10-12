import prisma from "../config/prisma.js";

export const createProvider = async (req, res) => {
  try {
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

    const existingProvider = await prisma.provider.findUnique({
      where: {
        userId: req.user.id
      }
    });

    if (existingProvider) {
      return res.status(409).json({
        success: false,
        message: "Provider profile already exists"
      });
    }

    const provider = await prisma.provider.create({
      data: {
        organization: organization.trim(),
        type: type.trim(),
        city: city.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        userId: req.user.id
      }
    });

    return res.status(201).json({
      success: true,
      message: "Provider profile created",
      data: provider
    });
  } catch (error) {
    console.error("Provider creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create provider profile"
    });
  }
};

export const getProviders = async (req, res) => {
  try {
    const { city, verified } = req.query;

    const where = {};

    if (city) {
      where.city = {
        contains: city,
        mode: "insensitive"
      };
    }

    if (verified !== undefined) {
      where.verified = verified === "true";
    }

    const providers = await prisma.provider.findMany({
      where,
      include: {
        resources: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (error) {
    console.error("Provider fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve providers"
    });
  }
};