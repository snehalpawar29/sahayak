import {prisma} from "../config/prisma.js";


/*
|--------------------------------------------------------------------------
| CREATE RESOURCE
|--------------------------------------------------------------------------
*/

export const createResource = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      available,
      city,
      address,
      description
    } = req.body;

    /*
     * req.provider was populated by
     * requireVerifiedProvider middleware.
     */

    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Verified provider authorization required"
      });
    }

    /*
     * Validate required fields.
     */

    if (!name || !category || !city) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category and city are required"
      });
    }

    /*
     * Quantity must be a non-negative number.
     */

    const resourceQuantity =
      quantity === undefined
        ? 0
        : Number(quantity);

    if (
      !Number.isInteger(resourceQuantity) ||
      resourceQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a non-negative integer"
      });
    }

    /*
     * Create resource.
     *
     * providerId comes from the authenticated
     * provider, NOT from the request body.
     *
     * This is important for security.
     */

    const resource = await prisma.resource.create({
      data: {
        name: name.trim(),
        category,
        quantity: resourceQuantity,
        available:
          available === undefined
            ? resourceQuantity > 0
            : Boolean(available),
        city: city.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
        providerId: req.provider.id
      }
    });

    return res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: {
        resource
      }
    });
  } catch (error) {
    console.error(
      "Create resource error:",
      error
    );

    /*
     * Prisma enum validation error.
     */
    if (error?.code === "P2000") {
      return res.status(400).json({
        success: false,
        message: "Invalid resource data"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create resource"
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
      category
    } = req.query;

    const where = {};

    if (city) {
      where.city = {
        contains: city,
        mode: "insensitive"
      };
    }

    if (category) {
      where.category = category;
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
            verified: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    /*
     * Only verified provider resources should
     * appear in the public resource finder.
     */

    const verifiedResources =
      resources.filter(
        (resource) =>
          resource.provider.verified === true
      );

    return res.status(200).json({
      success: true,
      count: verifiedResources.length,
      data: {
        resources: verifiedResources
      }
    });
  } catch (error) {
    console.error(
      "Get resources error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resources"
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
    const resourceId = Number(req.params.id);

    if (!Number.isInteger(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID"
      });
    }

    const resource =
      await prisma.resource.findUnique({
        where: {
          id: resourceId
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
        message: "Resource not found"
      });
    }

    /*
     * Don't expose resources belonging to
     * unverified providers.
     */

    if (!resource.provider.verified) {
      return res.status(404).json({
        success: false,
        message: "Resource not available"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        resource
      }
    });
  } catch (error) {
    console.error(
      "Get resource error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resource"
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
    const resourceId = Number(req.params.id);

    if (!Number.isInteger(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID"
      });
    }

    /*
     * Make sure the resource belongs to the
     * currently authenticated provider.
     */

    const existingResource =
      await prisma.resource.findUnique({
        where: {
          id: resourceId
        }
      });

    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    if (
      existingResource.providerId !==
      req.provider.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only modify your own resources"
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
      updateData.name = name.trim();
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);

      if (
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be a non-negative integer"
        });
      }

      updateData.quantity = parsedQuantity;
    }

    if (available !== undefined) {
      updateData.available = Boolean(
        available
      );
    }

    if (city !== undefined) {
      updateData.city = city.trim();
    }

    if (address !== undefined) {
      updateData.address =
        address?.trim() || null;
    }

    if (description !== undefined) {
      updateData.description =
        description?.trim() || null;
    }

    const updatedResource =
      await prisma.resource.update({
        where: {
          id: resourceId
        },
        data: updateData
      });

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: {
        resource: updatedResource
      }
    });
  } catch (error) {
    console.error(
      "Update resource error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update resource"
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
    const resourceId = Number(req.params.id);

    if (!Number.isInteger(resourceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID"
      });
    }

    const existingResource =
      await prisma.resource.findUnique({
        where: {
          id: resourceId
        }
      });

    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    if (
      existingResource.providerId !==
      req.provider.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only delete your own resources"
      });
    }

    await prisma.resource.delete({
      where: {
        id: resourceId
      }
    });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete resource error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete resource"
    });
  }
};