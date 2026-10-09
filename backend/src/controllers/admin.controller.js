import { prisma } from "../config/prisma.js";

const providerInclude = {
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
  resources: {
    select: {
      id: true,
      name: true,
      category: true,
      quantity: true,
      available: true,
      city: true,
      address: true,
      updatedAt: true
    },
    orderBy: { updatedAt: "desc" }
  }
};

export const getPendingProviders = async (_req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      where: { status: "PENDING" },
      include: providerInclude,
      orderBy: { createdAt: "asc" }
    });
    return res.status(200).json({ success: true, count: providers.length, providers });
  } catch (error) {
    console.error("Get pending providers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending providers" });
  }
};

export const getAllProviders = async (_req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      include: providerInclude,
      orderBy: { updatedAt: "desc" }
    });
    return res.status(200).json({ success: true, count: providers.length, providers });
  } catch (error) {
    console.error("Get all providers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch providers" });
  }
};

export const getAllEmergencyRequests = async (_req, res) => {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, city: true } },
        resource: {
          include: {
            provider: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Get all emergency requests error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch emergency requests" });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid provider ID" });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: providerInclude
    });

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    console.error("Get provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch provider" });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid provider ID" });
    }

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }
    if (provider.status === "APPROVED" || provider.verified) {
      return res.status(409).json({ success: false, message: "Provider is already approved" });
    }

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { status: "APPROVED", verified: true, rejectionReason: null },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });
    return res.status(200).json({ success: true, message: "Provider approved successfully", provider: updatedProvider });
  } catch (error) {
    console.error("Approve provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve provider" });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid provider ID" });
    }
    if (!reason || reason.length > 500) {
      return res.status(400).json({ success: false, message: "A rejection reason of 1–500 characters is required" });
    }

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: { status: "REJECTED", verified: false, rejectionReason: reason }
    });
    return res.status(200).json({ success: true, message: "Provider application rejected with reason", provider: updatedProvider });
  } catch (error) {
    console.error("Reject provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject provider" });
  }
};
