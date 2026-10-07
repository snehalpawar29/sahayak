import { prisma } from "../config/prisma.js";

const validPriorities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
];

const validStatuses = [
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED"
];

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
      parsedResourceId <= 0 ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid resourceId and quantity are required"
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request priority"
      });
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: parsedResourceId,
        provider: {
          verified: true
        }
      },
      include: {
        provider: true
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
        userId: Number(req.user.id),
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
        userId: Number(req.user.id)
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
    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider profile required"
      });
    }

    const requests = await prisma.emergencyRequest.findMany({
      where: {
        resource: {
          providerId: req.provider.id
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

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status"
      });
    }

    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider profile required"
      });
    }

    const request = await prisma.emergencyRequest.findFirst({
      where: {
        id: requestId,
        resource: {
          providerId: req.provider.id
        }
      },
      include: {
        resource: true
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Only pending requests can be updated"
      });
    }

    if (status === "ACCEPTED") {
      const updatedRequest = await prisma.$transaction(async (tx) => {
        const updatedResource = await tx.resource.updateMany({
          where: {
            id: request.resourceId,
            available: true,
            quantity: {
              gte: request.quantity
            }
          },
          data: {
            quantity: {
              decrement: request.quantity
            }
          }
        });

        if (updatedResource.count !== 1) {
          throw new Error(
            "INSUFFICIENT_RESOURCE_QUANTITY"
          );
        }

        await tx.resource.update({
          where: {
            id: request.resourceId
          },
          data: {
            available: true
          }
        });

        return tx.emergencyRequest.update({
          where: {
            id: requestId
          },
          data: {
            status: "ACCEPTED"
          },
          include: {
            resource: true
          }
        });
      });

      if (updatedRequest.resource.quantity === 0) {
        await prisma.resource.update({
          where: {
            id: updatedRequest.resource.id
          },
          data: {
            available: false
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: "Request accepted and resource inventory updated",
        data: updatedRequest
      });
    }

    const updatedRequest = await prisma.emergencyRequest.update({
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
    if (error.message === "INSUFFICIENT_RESOURCE_QUANTITY") {
      return res.status(409).json({
        success: false,
        message: "Insufficient resource quantity available"
      });
    }

    console.error("Request update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update request"
    });
  }
};