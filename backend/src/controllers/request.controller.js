import prisma from "../config/prisma.js";

export const createRequest = async (req, res) => {
  try {
    const { resourceId, quantity, priority = "MEDIUM", message } = req.body;
    const parsedResourceId = Number(resourceId);
    const parsedQuantity = Number(quantity);
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!Number.isInteger(parsedResourceId) || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Valid resourceId and positive quantity are required." });
    }
    if (!validPriorities.includes(priority)) return res.status(400).json({ success: false, message: "Invalid request priority." });

    const resource = await prisma.resource.findUnique({
      where: { id: parsedResourceId },
      include: { provider: { select: { verified: true } } }
    });
    if (!resource || !resource.provider.verified) return res.status(404).json({ success: false, message: "Resource not found." });
    if (!resource.available || resource.quantity < parsedQuantity) {
      return res.status(409).json({ success: false, message: "Requested resource is currently unavailable or the quantity is too high." });
    }

    const request = await prisma.emergencyRequest.create({
      data: { quantity: parsedQuantity, priority, message: message?.trim() || null, userId: req.user.id, resourceId: parsedResourceId },
      include: { resource: { include: { provider: { select: { id: true, organization: true, city: true } } } } }
    });
    return res.status(201).json({ success: true, message: "Emergency request submitted.", data: request });
  } catch (error) {
    console.error("Request creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create emergency request." });
  }
};

// Public request path for citizens who do not have a Sahayak account.
export const createGuestRequest = async (req, res) => {
  try {
    const requesterName = typeof req.body?.requesterName === "string"
      ? req.body.requesterName.trim()
      : "";
    const requesterEmail = typeof req.body?.requesterEmail === "string"
      ? req.body.requesterEmail.trim().toLowerCase()
      : "";
    const { resourceId, quantity, priority = "HIGH", message } = req.body || {};
    const parsedResourceId = Number(resourceId);
    const parsedQuantity = Number(quantity);
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (requesterName.length < 2 || requesterName.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Please enter a name between 2 and 120 characters."
      });
    }
    if (requesterEmail.length > 254 || !emailPattern.test(requesterEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (!Number.isInteger(parsedResourceId) || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Valid resourceId and positive quantity are required." });
    }
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: "Invalid request priority." });
    }
    if (typeof message === "string" && message.trim().length > 2000) {
      return res.status(400).json({ success: false, message: "The message must be 2,000 characters or fewer." });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: parsedResourceId },
      include: { provider: { select: { verified: true } } }
    });
    if (!resource || !resource.provider?.verified) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }
    if (!resource.available || resource.quantity < parsedQuantity) {
      return res.status(409).json({ success: false, message: "Requested resource is currently unavailable or the quantity is too high." });
    }

    const request = await prisma.emergencyRequest.create({
      data: {
        quantity: parsedQuantity,
        priority,
        message: typeof message === "string" ? message.trim() || null : null,
        requesterName,
        requesterEmail,
        resourceId: parsedResourceId
      },
      include: {
        resource: {
          include: { provider: { select: { id: true, organization: true, city: true } } }
        }
      }
    });
    return res.status(201).json({ success: true, message: "Emergency request submitted. The provider will review your request.", data: request });
  } catch (error) {
    console.error("Guest request creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create emergency request." });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      where: { userId: req.user.id },
      include: { resource: { include: { provider: { select: { id: true, organization: true, type: true, city: true } } } } },
      orderBy: { createdAt: "desc" }
    }
  );
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Requests fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve requests." });
  }
};

export const getProviderRequests = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found." });
    const requests = await prisma.emergencyRequest.findMany({
      where: { resource: { providerId: provider.id } },
      include: {
        user: { select: { id: true, name: true, email: true, city: true } },
        resource: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Provider requests error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve provider requests." });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const validStatuses = ["ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"];
    if (!Number.isInteger(requestId)) return res.status(400).json({ success: false, message: "Invalid request ID." });
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: "Invalid request status." });
    if (status === "REJECTED" && reason.length < 5) {
      return res.status(400).json({ success: false, message: "A rejection reason of at least 5 characters is required." });
    }

    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!provider) return res.status(404).json({ success: false, message: "Provider profile not found." });
    const request = await prisma.emergencyRequest.findFirst({
      where: { id: requestId, resource: { providerId: provider.id } }
    });
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });
    if (request.status !== "PENDING" && status !== "COMPLETED" && status !== "CANCELLED") {
      return res.status(409).json({ success: false, message: "Only pending requests can be accepted or rejected." });
    }
    const updatedRequest = await prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { status, rejectionReason: status === "REJECTED" ? reason : null },
      include: {
        user: { select: { id: true, name: true, email: true, city: true } },
        resource: true
      }
    });
    return res.status(200).json({ success: true, message: "Request status updated.", data: updatedRequest });
  } catch (error) {
    console.error("Request update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update request." });
  }
};
