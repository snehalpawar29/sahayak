import prisma from "../config/prisma.js";

const allowedDocumentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

const parseDocument = (body = {}) => {
  const { documentBase64, documentName, documentMimeType } = body;
  if (!documentBase64 || !documentName || !documentMimeType) {
    return { error: "Upload an authorization document (PDF, JPG or PNG)." };
  }
  if (!allowedDocumentTypes.has(documentMimeType)) {
    return { error: "Document must be a PDF, JPG or PNG file." };
  }
  const cleaned = String(documentBase64).replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    return { error: "The uploaded document is not valid base64 data." };
  }
  const bytes = Buffer.from(cleaned, "base64");
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) {
    return { error: "Document must be smaller than or equal to 4 MB." };
  }
  return {
    document: {
      verificationDocumentName: String(documentName).replace(/[\\/\0]/g, "_").slice(0, 180),
      verificationDocumentMimeType: documentMimeType,
      verificationDocumentData: bytes.toString("base64")
    }
  };
};

export const createProvider = async (req, res) => {
  try {
    const { organization, type, city, address, phone } = req.body;
    if (!organization?.trim() || !type?.trim() || !city?.trim()) {
      return res.status(400).json({ success: false, message: "Organization, type and city are required." });
    }

    const parsed = parseDocument(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const existingProvider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (existingProvider) {
      return res.status(409).json({ success: false, message: "Provider profile already exists." });
    }

    const provider = await prisma.provider.create({
      data: {
        organization: organization.trim(),
        type: type.trim(),
        city: city.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        userId: req.user.id,
        verificationStatus: "PENDING",
        verified: false,
        ...parsed.document
      },
      select: {
        id: true, organization: true, type: true, city: true, address: true, phone: true,
        verified: true, verificationStatus: true, verificationRejectionReason: true,
        verificationDocumentName: true, verificationDocumentMimeType: true,
        createdAt: true, updatedAt: true, userId: true
      }
    });
    return res.status(201).json({ success: true, message: "Provider profile submitted for verification.", data: provider });
  } catch (error) {
    console.error("Provider creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create provider profile." });
  }
};

export const getMyProvider = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true, organization: true, type: true, city: true, address: true, phone: true,
        verified: true, verificationStatus: true, verificationRejectionReason: true,
        verificationDocumentName: true, verificationDocumentMimeType: true,
        createdAt: true, updatedAt: true, userId: true,
        resources: { orderBy: { updatedAt: "desc" } }
      }
    });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found." });
    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    console.error("Get own provider error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve provider profile." });
  }
};

export const updateVerificationDocument = async (req, res) => {
  try {
    const parsed = parseDocument(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) return res.status(404).json({ success: false, message: "Create your provider profile first." });
    if (provider.verificationStatus === "APPROVED") {
      return res.status(409).json({ success: false, message: "Your provider profile is already approved. Contact support if your documents need to be changed." });
    }

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        ...parsed.document,
        verified: false,
        verificationStatus: "PENDING",
        verificationRejectionReason: null,
        verifiedAt: null
      },
      select: {
        id: true, organization: true, verificationStatus: true,
        verificationRejectionReason: true, verificationDocumentName: true,
        verificationDocumentMimeType: true, verified: true
      }
    });
    return res.status(200).json({ success: true, message: "Updated document submitted for review.", data: updated });
  } catch (error) {
    console.error("Update provider document error:", error);
    return res.status(500).json({ success: false, message: "Unable to update verification document." });
  }
};

// Public directory intentionally exposes verified providers only and never returns document data.
export const getProviders = async (req, res) => {
  try {
    const { city, verified } = req.query;
    const where = { verified: true };
    if (city) where.city = { contains: String(city), mode: "insensitive" };
    if (verified === "false") {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const providers = await prisma.provider.findMany({
      where,
      select: {
        id: true, organization: true, type: true, city: true, address: true, phone: true,
        verified: true, verificationStatus: true, createdAt: true, updatedAt: true, userId: true,
        resources: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    console.error("Provider fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve providers." });
  }
};
