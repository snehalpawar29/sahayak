import { prisma } from "../config/prisma.js";

const validCategories = [
  "BLOOD",
  "HOSPITAL_BED",
  "MEDICINE",
  "AMBULANCE",
  "SHELTER",
  "FOOD",
  "WATER"
];

const parsePositiveId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const parseQuantity = (value) => {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    return null;
  }

  return quantity;
};

/*
|--------------------------------------------------------------------------
| CREATE RESOURCE
|--------------------------------------------------------------------------
*/

export const createResource = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider authorization required."
      });
    }

    const {
      name,
      category,
      quantity = 0,
      available,
      city,
      address,
      description
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resource name is required."
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource category."
      });
    }

    if (!city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required."
      });
    }

    const parsedQuantity = parseQuantity(quantity);

    if (parsedQuantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a non-negative integer."
      });
    }

    /*
     * Quantity controls whether the resource can actually be available.
     * A quantity of 0 always means unavailable.
     */
    const finalAvailable =
      parsedQuantity > 0 && available === true;

    const resource = await prisma.resource.create({
      data: {
        name: name.trim(),
        category,
        quantity: parsedQuantity,
        available: finalAvailable,
        city: city.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
        providerId: req.provider.id
      },
      include: {
        provider: {
          select: {
            id: true,
            organization: true,
            type: true,
            city: true,
            address: true,
            phone: true,
            verified: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "Resource created successfully.",
      data: resource
    });
  } catch (error) {
    console.error("Create resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create resource."
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL RESOURCES
|--------------------------------------------------------------------------
*/

export const getResources = async (req, res) => {
  try {
    const {
      city,
      category,
      available
    } = req.query;

    const where = {
      provider: {
        verified: true
      }
    };

    if (city) {
      where.city = {
        contains: city,
        mode: "insensitive"
      };
    }

    if (category) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource category."
        });
      }

      where.category = category;
    }

    if (available === "true") {
      where.available = true;
      where.quantity = {
        gt: 0
      };
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            organization: true,
            type: true,
            city: true,
            address: true,
            phone: true,
            verified: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: {
        resources
      }
    });
  } catch (error) {
    console.error("Get resources error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resources."
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET RESOURCE BY ID
|--------------------------------------------------------------------------
*/

export const getResourceById = async (req, res) => {
  try {
    const resourceId = parsePositiveId(req.params.id);

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        provider: {
          verified: true
        }
      },
      include: {
        provider: {
          select: {
            id: true,
            organization: true,
            type: true,
            city: true,
            address: true,
            phone: true,
            verified: true
          }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    console.error("Get resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resource."
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE RESOURCE
|--------------------------------------------------------------------------
*/

export const updateResource = async (req, res) => {
  try {
    const resourceId = parsePositiveId(req.params.id);

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider authorization required."
      });
    }

    const existingResource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        providerId: req.provider.id
      }
    });

    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found."
      });
    }

    const {
      name,
      category,
      quantity,
      available,
      city,
      address,
      description
    } = req.body;

    const updateData = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Resource name cannot be empty."
        });
      }

      updateData.name = name.trim();
    }

    if (category !== undefined) {
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource category."
        });
      }

      updateData.category = category;
    }

    /*
     * Quantity is independently editable.
     */
    if (quantity !== undefined) {
      const parsedQuantity = parseQuantity(quantity);

      if (parsedQuantity === null) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a non-negative integer."
        });
      }

      updateData.quantity = parsedQuantity;

      /*
       * Zero quantity can never be available.
       */
      if (parsedQuantity === 0) {
        updateData.available = false;
      }
    }

    /*
     * Availability is independently controllable.
     *
     * If quantity was changed in this request, use the new quantity.
     * Otherwise use the existing quantity.
     */
    if (available !== undefined) {
      const effectiveQuantity =
        updateData.quantity !== undefined
          ? updateData.quantity
          : existingResource.quantity;

      updateData.available =
        effectiveQuantity > 0 && available === true;
    }

    if (city !== undefined) {
      if (!city?.trim()) {
        return res.status(400).json({
          success: false,
          message: "City cannot be empty."
        });
      }

      updateData.city = city.trim();
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null;
    }

    if (description !== undefined) {
      updateData.description =
        description?.trim() || null;
    }

    const updatedResource = await prisma.resource.update({
      where: {
        id: resourceId
      },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            organization: true,
            type: true,
            city: true,
            address: true,
            phone: true,
            verified: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully.",
      data: updatedResource
    });
  } catch (error) {
    console.error("Update resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update resource."
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE RESOURCE
|--------------------------------------------------------------------------
*/

export const deleteResource = async (req, res) => {
  try {
    const resourceId = parsePositiveId(req.params.id);

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider authorization required."
      });
    }

    const existingResource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        providerId: req.provider.id
      }
    });

    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found."
      });
    }

    await prisma.resource.delete({
      where: {
        id: resourceId
      }
    });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully."
    });
  } catch (error) {
    console.error("Delete resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete resource."
    });
  }
};