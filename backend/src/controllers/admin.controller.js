import prisma from "../config/prisma.js";

const providerListSelect = {
  id: true, organization: true, type: true, city: true, address: true, phone: true,
  verified: true, verificationStatus: true, verificationRejectionReason: true,
  verificationDocumentName: true, verificationDocumentMimeType: true,
  verifiedAt: true, createdAt: true, updatedAt: true, userId: true,
  user: { select: { id: true, name: true, email: true, city: true, createdAt: true } },
  resources: { orderBy: { updatedAt: "desc" } }
};

export const getAllProviders = async (_req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      select: providerListSelect,
      orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }]
    });
    return res.status(200).json({ success: true, count: providers.length, providers });
  } catch (error) {
    console.error("Get all providers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch providers." });
  }
};

export const getPendingProviders = async (_req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      where: { verificationStatus: "PENDING" },
      select: providerListSelect,
      orderBy: { createdAt: "asc" }
    });
    return res.status(200).json({ success: true, count: providers.length, providers });
  } catch (error) {
    console.error("Get pending providers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending providers." });
  }
};

export const getProviderById = async (req, res) => {
  const providerId = Number(req.params.id);
  if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: "Invalid provider ID." });
  try {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: providerListSelect });
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found." });
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    console.error("Get provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch provider." });
  }
};

export const getProviderDocument = async (req, res) => {
  const providerId = Number(req.params.id);
  if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: "Invalid provider ID." });
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { verificationDocumentData: true, verificationDocumentName: true, verificationDocumentMimeType: true }
    });
    if (!provider?.verificationDocumentData) return res.status(404).json({ success: false, message: "No verification document uploaded." });
    const safeName = (provider.verificationDocumentName || "provider-document").replace(/[^\w. -]/g, "_").replace(/[\r\n"]/g, "_");
    res.setHeader("Content-Type", provider.verificationDocumentMimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(Buffer.from(provider.verificationDocumentData, "base64"));
  } catch (error) {
    console.error("Get provider document error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve verification document." });
  }
};

export const getAllRequests = async (_req, res) => {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, city: true } },
        resource: {
          include: {
            provider: { select: { id: true, organization: true, type: true, city: true, verified: true, verificationStatus: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Get all requests error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch emergency requests." });
  }
};

export const approveProvider = async (req, res) => {
  const providerId = Number(req.params.id);
  if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: "Invalid provider ID." });
  try {
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found." });
    if (!provider.verificationDocumentData) return res.status(400).json({ success: false, message: "Cannot approve a provider without an authorization document." });
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { verified: true, verificationStatus: "APPROVED", verificationRejectionReason: null, verifiedAt: new Date() },
      select: providerListSelect
    });
    return res.status(200).json({ success: true, message: "Provider approved successfully.", provider: updated });
  } catch (error) {
    console.error("Approve provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve provider." });
  }
};

export const rejectProvider = async (req, res) => {
  const providerId = Number(req.params.id);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: "Invalid provider ID." });
  if (reason.length < 5) return res.status(400).json({ success: false, message: "Provide a rejection reason of at least 5 characters." });
  try {
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found." });
    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: { verified: false, verificationStatus: "REJECTED", verificationRejectionReason: reason, verifiedAt: null },
      select: providerListSelect
    });
    return res.status(200).json({ success: true, message: "Provider rejection recorded.", provider: updated });
  } catch (error) {
    console.error("Reject provider error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject provider." });
  }
};
