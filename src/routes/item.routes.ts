import { Router, Request, Response } from "express";
import prisma from "../config/prisma";
import {
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole
} from "../middleware/auth";

const router = Router();

const INVENTORY_ROLES = [
  "ADMIN",
  "STOREKEEPER",
  "PROCUREMENT"
];

/**
 * @openapi
 * /api/items/categories:
 *   post:
 *     tags:
 *       - Items
 *     summary: Create a new item category.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created.
 */

router.post(
  "/categories",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (req: Request, res: Response) => {
    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Category name is required."
      });
    }

    const existing = await prisma.itemCategory.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "A category with this name already exists."
      });
    }

    const category = await prisma.itemCategory.create({
      data: {
        name,
        description: description || null
      }
    });

    res.status(201).json({
      success: true,
      category
    });
  }
);

/**
 * @openapi
 * /api/items/categories:
 *   get:
 *     tags:
 *       - Items
 *     summary: List item categories.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories.
 */

router.get(
  "/categories",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (_req: Request, res: Response) => {
    const categories = await prisma.itemCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });

    res.json({
      success: true,
      categories
    });
  }
);

/**
 * @openapi
 * /api/items:
 *   post:
 *     tags:
 *       - Items
 *     summary: Create a new item.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               unit:
 *                 type: string
 *               isTrackable:
 *                 type: boolean
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created.
 */

router.post(
  "/",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (req: Request, res: Response) => {
    const {
      name,
      sku,
      description,
      unit,
      isTrackable,
      categoryId
    } = req.body as {
      name?: string;
      sku?: string;
      description?: string;
      unit?: string;
      isTrackable?: boolean;
      categoryId?: string;
    };

    if (!name || !unit || !categoryId) {
      return res.status(400).json({
        success: false,
        error: "name, unit and categoryId are required."
      });
    }

    // Check category exists & active
    const category = await prisma.itemCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        error: "Invalid or inactive categoryId."
      });
    }

    if (sku) {
      const existingSku = await prisma.item.findUnique({
        where: { sku }
      });
      if (existingSku) {
        return res.status(409).json({
          success: false,
          error: "An item with this SKU already exists."
        });
      }
    }

    const item = await prisma.item.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        unit,
        isTrackable: Boolean(isTrackable),
        categoryId
      }
    });

    res.status(201).json({
      success: true,
      item
    });
  }
);

/**
 * @openapi
 * /api/items:
 *   get:
 *     tags:
 *       - Items
 *     summary: List items.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of items.
 */
router.get(
  "/",
  authMiddleware,
  requireAuth,
  requireNonFirstLogin,
  requireRole(INVENTORY_ROLES),
  async (req: Request, res: Response) => {
    const { search, categoryId } = req.query as {
      search?: string;
      categoryId?: string;
    };

    const where: any = {
      isActive: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { name: "asc" }
    });

    res.json({
      success: true,
      items
    });
  }
);

export default router;