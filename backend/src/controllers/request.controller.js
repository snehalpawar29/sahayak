import { prisma } from "../config/prisma.js"
export const createRequest = async (req, res) => {
  try {
    const {
      resourceId,
      quantity,
      priority = "MEDIUM",
      message
    } = req.body;

    const parsedResourceId = Number(resourceId);
    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedResourceId) ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid resourceId and quantity are required"
      });
    }

    const resource = await prisma.resource.findUnique({
      where: {
        id: parsedResourceId
      }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    if (!resource.available || resource.quantity < parsedQuantity) {
      return res.status(409).json({
        success: false,
        message: "Requested resource is currently unavailable"
      });
    }

    const request = await prisma.emergencyRequest.create({
      data: {
        quantity: parsedQuantity,
        priority,
        message: message?.trim() || null,
        userId: req.user.id,
        resourceId: parsedResourceId
      },
      include: {
        resource: {
          include: {
            provider: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "Emergency request submitted",
      data: request
    });
  } catch (error) {
    console.error("Request creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create emergency request"
    });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        resource: {
          include: {
            provider: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error("Requests fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve requests"
    });
  }
};

export const getProviderRequests = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: {
        userId: req.user.id
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    const requests = await prisma.emergencyRequest.findMany({
      where: {
        resource: {
          providerId: provider.id
        }
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
        resource: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error("Provider requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve provider requests"
    });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = [
      "ACCEPTED",
      "REJECTED",
      "COMPLETED",
      "CANCELLED"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status"
      });
    }

    const provider = await prisma.provider.findUnique({
      where: {
        userId: req.user.id
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    const request = await prisma.emergencyRequest.findFirst({
      where: {
        id: requestId,
        resource: {
          providerId: provider.id
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    const updatedRequest =
      await prisma.emergencyRequest.update({
        where: {
          id: requestId
        },
        data: {
          status
        }
      });

    return res.status(200).json({
      success: true,
      message: "Request status updated",
      data: updatedRequest
    });
  } catch (error) {
    console.error("Request update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update request"
    });
  }
};